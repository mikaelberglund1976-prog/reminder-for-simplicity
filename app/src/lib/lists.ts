// Access control + lookup helpers for the generalized List model
// (2026-07-27) — powers both multiple shopping lists and multiple per-child
// wishlists. See the comment on `model List` in prisma/schema.prisma for the
// visibility rules this implements.

import { prisma } from "@/lib/prisma";

export type HouseholdRoleStr = "OWNER" | "PARENT" | "ADULT" | "CHILD" | "MEMBER";
export type ListKindStr = "SHOPPING" | "WISHLIST";

export type ListRow = {
  id: string;
  householdId: string;
  kind: ListKindStr;
  name: string;
  ownerId: string | null;
  visibleToAll: boolean;
  shareToken: string | null;
  createdBy: string;
};

// Only OWNER/PARENT can change who a list is shared with — the person
// setting up the household controls that, not whoever happens to create a
// list (see the 2026-07-27 decision).
export function canEditListAccess(role: HouseholdRoleStr): boolean {
  return role === "OWNER" || role === "PARENT";
}

// Whether `userId` (with the given household role) can see a list at all.
export function userCanAccessList(list: ListRow, userId: string, role: HouseholdRoleStr, memberIds: string[]): boolean {
  if (list.ownerId === userId) return true; // a child always sees their own wishlists
  if (list.createdBy === userId) return true;
  if (canEditListAccess(role)) return true; // OWNER/PARENT have full oversight
  if (memberIds.includes(userId)) return true;
  if (list.visibleToAll) {
    // visibleToAll means "everyone" for a SHOPPING list, but for a WISHLIST
    // it means "every adult" — a child never sees another child's wishlist
    // by default, only their own (P0.6/P0.7). They can still be added as an
    // explicit ListMember if a household really wants to share one.
    if (list.kind === "WISHLIST" && role === "CHILD") return false;
    return true;
  }
  return false;
}

export async function getListMemberIds(listId: string): Promise<string[]> {
  const rows = await prisma.listMember.findMany({ where: { listId }, select: { userId: true } });
  return rows.map((r) => r.userId);
}

// Finds (or lazily creates) the household's/child's default list of a kind.
// Used so a household that predates this feature — or a brand new one —
// always has at least one list to land on.
export async function ensureDefaultList(opts: {
  householdId: string;
  kind: ListKindStr;
  ownerId?: string | null; // WISHLIST only
  createdBy: string;
  name: string;
}): Promise<ListRow> {
  const existing = await prisma.list.findFirst({
    where: { householdId: opts.householdId, kind: opts.kind, ownerId: opts.ownerId ?? null },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  return prisma.list.create({
    data: {
      householdId: opts.householdId,
      kind: opts.kind,
      name: opts.name,
      ownerId: opts.ownerId ?? null,
      createdBy: opts.createdBy,
    },
  });
}

// All lists of a kind in the household that `userId` (with `role`) is
// allowed to see, newest-first for WISHLIST (recently added children first
// isn't meaningful) — actually just by createdAt asc so lists appear in the
// order they were made.
export async function listsVisibleTo(householdId: string, kind: ListKindStr, userId: string, role: HouseholdRoleStr): Promise<ListRow[]> {
  // 2026-09-28: a deleted person's own lists (e.g. their wishlist) are hidden
  // with the account for the 60-day restore window, and come back on restore.
  const all = await prisma.list.findMany({
    where: { householdId, kind, OR: [{ ownerId: null }, { owner: { deletedAt: null } }] },
    orderBy: { createdAt: "asc" },
  });
  if (canEditListAccess(role)) return all; // adults see everything for oversight
  const results: ListRow[] = [];
  for (const list of all) {
    if (list.ownerId === userId || list.createdBy === userId || list.visibleToAll) {
      results.push(list);
      continue;
    }
    const memberIds = await getListMemberIds(list.id);
    if (memberIds.includes(userId)) results.push(list);
  }
  return results;
}

// 2026-09-28: a FREE household gets exactly one shared shopping list — the
// oldest one. Extra lists (and wishlists) need Pro or the trial; see
// lib/entitlements.ts. Lists created during a trial stay in the database
// after it ends, they're just read-locked until the family upgrades.
export async function freeShoppingListId(householdId: string): Promise<string | null> {
  const first = await prisma.list.findFirst({
    where: { householdId, kind: "SHOPPING" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return first?.id ?? null;
}
