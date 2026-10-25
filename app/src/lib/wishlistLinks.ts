// 2026-10-25 (masterbrief §20, Etapp 5 "wishlist sharing experiment"):
// a secure link per wishlist that relatives can open WITHOUT an account.
//
// NOT LIVE until FEATURE_WISHLIST_LINK=true (Vercel env) — on 2026-08-02
// Mikael decided wishlist sharing needs an account (lib/wishlistGuests.ts);
// the brief (24 Oct) recommends a link. Built behind the flag so Mikael can
// decide; with the flag off every route answers 404 and nothing is created.
//
// Rules (brief §20):
//   - one link per list, unguessable token (32 random bytes), only that list
//   - can be revoked at any time; expires after 90 days by default
//   - the recipient sees the list's wishes and whether each is taken — no
//     other family data, no names of who reserved what
//   - a guest reserves with just a name; adults see that name, the child never
//     sees reservations at all (same as every other reservation)
//
// Self-creating tables (OPERATIONS.md §5a):
//   wishlist_links        — id, token, householdId, listId, createdBy, createdAt, expiresAt, revokedAt
//   wishlist_link_reservations — itemId (one per item), linkId, guestName, createdAt
import { randomBytes, randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export const WISHLIST_LINK_ENABLED = process.env.FEATURE_WISHLIST_LINK === "true";
const LINK_DAYS = 90;

let ensured: Promise<void> | null = null;
export function ensureWishlistLinkTables(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "wishlist_links" ("id" TEXT NOT NULL, "token" TEXT NOT NULL, "householdId" TEXT NOT NULL, "listId" TEXT NOT NULL, "createdBy" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3), CONSTRAINT "wishlist_links_pkey" PRIMARY KEY ("id"))`);
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "wishlist_links_token_key" ON "wishlist_links" ("token")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "wishlist_links_list_idx" ON "wishlist_links" ("listId")`);
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "wishlist_link_reservations" ("itemId" TEXT NOT NULL, "linkId" TEXT NOT NULL, "guestName" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "wishlist_link_reservations_pkey" PRIMARY KEY ("itemId"))`);
    })().catch((err) => { ensured = null; throw err; });
  }
  return ensured;
}

export type LinkRow = { id: string; token: string; householdId: string; listId: string; createdBy: string; createdAt: Date; expiresAt: Date; revokedAt: Date | null };

export async function activeLinkForList(listId: string): Promise<LinkRow | null> {
  await ensureWishlistLinkTables();
  const rows = await prisma.$queryRaw<LinkRow[]>`SELECT * FROM "wishlist_links" WHERE "listId" = ${listId} AND "revokedAt" IS NULL AND "expiresAt" > NOW() ORDER BY "createdAt" DESC LIMIT 1`;
  return rows[0] ?? null;
}

export async function createLink(householdId: string, listId: string, createdBy: string): Promise<LinkRow> {
  await ensureWishlistLinkTables();
  // One active link per list: a new one replaces the old.
  await prisma.$executeRaw`UPDATE "wishlist_links" SET "revokedAt" = NOW() WHERE "listId" = ${listId} AND "revokedAt" IS NULL`;
  const id = randomUUID();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + LINK_DAYS * 86400000);
  await prisma.$executeRaw`INSERT INTO "wishlist_links" ("id", "token", "householdId", "listId", "createdBy", "expiresAt") VALUES (${id}, ${token}, ${householdId}, ${listId}, ${createdBy}, ${expiresAt})`;
  return (await prisma.$queryRaw<LinkRow[]>`SELECT * FROM "wishlist_links" WHERE "id" = ${id}`)[0];
}

export async function revokeLinks(listId: string): Promise<void> {
  await ensureWishlistLinkTables();
  await prisma.$executeRaw`UPDATE "wishlist_links" SET "revokedAt" = NOW() WHERE "listId" = ${listId} AND "revokedAt" IS NULL`;
}

export async function linkByToken(token: string): Promise<LinkRow | null> {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  await ensureWishlistLinkTables();
  const rows = await prisma.$queryRaw<LinkRow[]>`SELECT * FROM "wishlist_links" WHERE "token" = ${token} AND "revokedAt" IS NULL AND "expiresAt" > NOW() LIMIT 1`;
  return rows[0] ?? null;
}

/** itemId → guest name, for adults' view of the list. */
export async function guestReservations(itemIds: string[]): Promise<Map<string, string>> {
  if (!itemIds.length) return new Map();
  try {
    await ensureWishlistLinkTables();
    const rows = await prisma.$queryRaw<{ itemId: string; guestName: string }[]>`SELECT "itemId", "guestName" FROM "wishlist_link_reservations" WHERE "itemId" = ANY(${itemIds}::text[])`;
    return new Map(rows.map((r) => [r.itemId, r.guestName]));
  } catch (err) {
    console.error("guestReservations failed", err);
    return new Map();
  }
}

/** A guest reserves one wish. Only a wish that's still free. Returns false if taken. */
export async function reserveAsGuest(link: LinkRow, itemId: string, guestName: string): Promise<boolean> {
  await ensureWishlistLinkTables();
  const n = await prisma.wishlistItem.updateMany({ where: { id: itemId, listId: link.listId, status: "WANTED" }, data: { status: "RESERVED", reservedAt: new Date(), reservedBy: null } });
  if (n.count === 0) return false;
  await prisma.$executeRaw`INSERT INTO "wishlist_link_reservations" ("itemId", "linkId", "guestName") VALUES (${itemId}, ${link.id}, ${guestName.slice(0, 60)}) ON CONFLICT ("itemId") DO UPDATE SET "linkId" = EXCLUDED."linkId", "guestName" = EXCLUDED."guestName", "createdAt" = CURRENT_TIMESTAMP`;
  return true;
}
