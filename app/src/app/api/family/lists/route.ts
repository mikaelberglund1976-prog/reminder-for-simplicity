import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureDefaultList, listsVisibleTo, getListMemberIds, canEditListAccess, type ListKindStr, type HouseholdRoleStr } from "@/lib/lists";

// GET /api/family/lists?kind=SHOPPING|WISHLIST
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const kind = searchParams.get("kind") as ListKindStr | null;
    if (kind !== "SHOPPING" && kind !== "WISHLIST") {
      return NextResponse.json({ error: "kind must be SHOPPING or WISHLIST" }, { status: 400 });
    }

    const membership = await prisma.householdMember.findFirst({
      where: { userId: session.user.id },
      include: { household: { include: { familyTrial: true } } },
    });
    if (!membership) return NextResponse.json({ lists: [], access: "NO_HOUSEHOLD" });

    const isPro = membership.household.is_pro;
    const trial = membership.household.familyTrial;
    const trialActive = trial ? trial.expiresAt > new Date() : false;
    if (!isPro && !trialActive) return NextResponse.json({ lists: [], access: "LOCKED" });

    const role = membership.role as HouseholdRoleStr;

    // Lazily create a default list so nobody lands on an empty "no lists" screen.
    if (kind === "SHOPPING") {
      await ensureDefaultList({ householdId: membership.householdId, kind: "SHOPPING", createdBy: session.user.id, name: "Shopping list" });
    } else {
      // 2026-08-18: wishlists are no longer CHILD-only — every household
      // member (adult or child) can have their own. Always make sure the
      // caller has their own default wishlist...
      await ensureDefaultList({ householdId: membership.householdId, kind: "WISHLIST", ownerId: session.user.id, createdBy: session.user.id, name: "Wishlist" });

      // ...and, for OWNER/PARENT (who also get the "Family" browsing tab),
      // make sure every *other* member has one too, so they don't land on an
      // empty "no lists" screen before anyone else has visited the page yet.
      // (Fixed 2026-07-28 for children only; broadened 2026-08-18 to every role.)
      if (canEditListAccess(role)) {
        const others = await prisma.householdMember.findMany({
          where: { householdId: membership.householdId, userId: { not: session.user.id } },
          select: { userId: true },
        });
        for (const other of others) {
          await ensureDefaultList({ householdId: membership.householdId, kind: "WISHLIST", ownerId: other.userId, createdBy: other.userId, name: "Wishlist" });
        }
      }
    }

    const lists = await listsVisibleTo(membership.householdId, kind, session.user.id, role);
    const ownerIds = Array.from(new Set(lists.map((l) => l.ownerId).filter((v): v is string => !!v)));
    const owners = ownerIds.length
      ? await prisma.user.findMany({ where: { id: { in: ownerIds } }, select: { id: true, name: true } })
      : [];
    const ownerName = new Map(owners.map((o) => [o.id, o.name]));

    const withMembers = await Promise.all(
      lists.map(async (l) => ({
        ...l,
        ownerName: l.ownerId ? ownerName.get(l.ownerId) ?? null : null,
        memberIds: await getListMemberIds(l.id),
        isMine: l.createdBy === session.user.id || l.ownerId === session.user.id,
      }))
    );

    return NextResponse.json({ lists: withMembers, access: isPro ? "PRO" : "TRIAL", canEditAccess: canEditListAccess(role), role });
  } catch (err) {
    console.error("Lists GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/family/lists — body: { kind, name, ownerId? }
// ownerId only applies to WISHLIST lists: a child creating their own list
// omits it (defaults to self), an OWNER/PARENT can set up a list on behalf
// of a specific child.
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await prisma.householdMember.findFirst({ where: { userId: session.user.id } });
    if (!membership) return NextResponse.json({ error: "No household" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { kind, name, ownerId } = body ?? {};
    if (kind !== "SHOPPING" && kind !== "WISHLIST") return NextResponse.json({ error: "kind must be SHOPPING or WISHLIST" }, { status: 400 });
    if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const role = membership.role as HouseholdRoleStr;
    let resolvedOwnerId: string | null = null;

    if (kind === "WISHLIST") {
      resolvedOwnerId = (ownerId as string | undefined) || session.user.id;
      if (resolvedOwnerId !== session.user.id && !canEditListAccess(role)) {
        return NextResponse.json({ error: "Only an OWNER/PARENT can create a wishlist for someone else" }, { status: 403 });
      }
      // 2026-08-18: a wishlist can belong to ANY household member, not just a
      // CHILD — everyone should be able to have their own wishlist, it's just
      // always tied to one specific person (see Mikael's 2026-08-18 feedback).
      const ownerMembership = await prisma.householdMember.findFirst({ where: { userId: resolvedOwnerId, householdId: membership.householdId } });
      if (!ownerMembership) {
        return NextResponse.json({ error: "Selected person is not in this household" }, { status: 400 });
      }
    }

    const list = await prisma.list.create({
      data: {
        householdId: membership.householdId,
        kind,
        name: name.trim(),
        ownerId: resolvedOwnerId,
        createdBy: session.user.id,
      },
    });

    return NextResponse.json({ ...list, memberIds: [], isMine: true }, { status: 201 });
  } catch (err) {
    console.error("Lists POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
