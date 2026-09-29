// 2026-09-29 (GDPR review, launch list row 18): parent/guardian consent for
// a child's account. The parent is the customer and the child's data is kept
// on the family's agreement with us (GDPR art. 6.1 b); this records that a
// guardian confirmed it — when, who, and which privacy-notice version.
import { prisma } from "@/lib/prisma";

import { CONSENT_VERSION } from "@/lib/consent-version";
export { CONSENT_VERSION };
export const GUARDIAN_ROLES = ["OWNER", "PARENT"];

let ensured: Promise<void> | null = null;
export function ensureConsentTable(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "parental_consents" ("id" TEXT NOT NULL, "childId" TEXT NOT NULL, "householdId" TEXT NOT NULL, "givenById" TEXT NOT NULL, "version" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "parental_consents_pkey" PRIMARY KEY ("id"))`
      );
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "parental_consents_childId_idx" ON "parental_consents"("childId")`
      );
    })().catch((err) => { ensured = null; throw err; });
  }
  return ensured;
}

export async function recordConsent(childId: string, householdId: string, givenById: string) {
  await ensureConsentTable();
  return prisma.parentalConsent.create({ data: { childId, householdId, givenById, version: CONSENT_VERSION } });
}

/** Latest consent per child in a household: childId → { at, byName }. */
export async function consentsForHousehold(householdId: string) {
  await ensureConsentTable();
  const rows = await prisma.parentalConsent.findMany({ where: { householdId }, orderBy: { createdAt: "desc" } });
  const byIds = Array.from(new Set(rows.map((r) => r.givenById)));
  const givers = byIds.length ? await prisma.user.findMany({ where: { id: { in: byIds } }, select: { id: true, name: true } }) : [];
  const name = new Map(givers.map((g) => [g.id, g.name]));
  const out: Record<string, { at: string; byName: string | null; version: string }> = {};
  for (const r of rows) {
    if (!out[r.childId]) out[r.childId] = { at: r.createdAt.toISOString(), byName: name.get(r.givenById) ?? null, version: r.version };
  }
  return out;
}
