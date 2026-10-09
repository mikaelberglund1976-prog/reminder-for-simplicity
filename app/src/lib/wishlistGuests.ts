// 2026-10-09: share a child's wishlist with relatives outside the family
// (PRODUCT_SPEC 4b.31, the "Guest" model, wishlist-only first step).
// Decided by Mikael 2026-08-02: an invite needs an account/login — no
// anonymous link. A guest is invited by email; the access is bound to the
// account with that (verified) email the first time it opens /gifts. A guest
// sees one child's wishes and can reserve / mark as bought, nothing else of
// the family. The child never sees who reserved what (same rule as before).
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

let ensured: Promise<void> | null = null;
export function ensureGuestTable(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "wishlist_guests" ("id" TEXT NOT NULL, "householdId" TEXT NOT NULL, "childId" TEXT NOT NULL, "email" TEXT NOT NULL, "userId" TEXT, "invitedBy" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "acceptedAt" TIMESTAMP(3), CONSTRAINT "wishlist_guests_pkey" PRIMARY KEY ("id"))`
      );
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "wishlist_guests_child_email" ON "wishlist_guests" ("childId", "email")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "wishlist_guests_email" ON "wishlist_guests" ("email")`);
    })().catch((err) => { ensured = null; throw err; });
  }
  return ensured;
}

export type GuestRow = { id: string; householdId: string; childId: string; email: string; userId: string | null; invitedBy: string; createdAt: Date; acceptedAt: Date | null };

export async function listGuestsForChild(householdId: string, childId: string): Promise<GuestRow[]> {
  await ensureGuestTable();
  return prisma.$queryRawUnsafe<GuestRow[]>(`SELECT * FROM "wishlist_guests" WHERE "householdId" = $1 AND "childId" = $2 ORDER BY "createdAt" ASC`, householdId, childId);
}

export async function addGuest(householdId: string, childId: string, email: string, invitedBy: string): Promise<{ created: boolean }> {
  await ensureGuestTable();
  const n = await prisma.$executeRawUnsafe(
    `INSERT INTO "wishlist_guests" ("id", "householdId", "childId", "email", "invitedBy") VALUES ($1, $2, $3, $4, $5) ON CONFLICT ("childId", "email") DO NOTHING`,
    randomBytes(12).toString("hex"), householdId, childId, email.toLowerCase(), invitedBy
  );
  return { created: n > 0 };
}

export async function removeGuest(householdId: string, id: string) {
  await ensureGuestTable();
  await prisma.$executeRawUnsafe(`DELETE FROM "wishlist_guests" WHERE "id" = $1 AND "householdId" = $2`, id, householdId);
}

/** Binds pending invites for this verified email to the account, then returns the account's shares. */
export async function sharesForUser(userId: string, email: string): Promise<GuestRow[]> {
  await ensureGuestTable();
  await prisma.$executeRawUnsafe(
    `UPDATE "wishlist_guests" SET "userId" = $1, "acceptedAt" = CURRENT_TIMESTAMP WHERE "email" = $2 AND "userId" IS NULL`,
    userId, email.toLowerCase()
  );
  return prisma.$queryRawUnsafe<GuestRow[]>(`SELECT * FROM "wishlist_guests" WHERE "userId" = $1 ORDER BY "createdAt" ASC`, userId);
}
