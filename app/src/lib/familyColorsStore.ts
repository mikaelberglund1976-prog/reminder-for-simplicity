// 2026-10-10: storage for the family's colours (lib/familyColors.ts). Self-
// creating side table like user_home_prefs — no manual database step.
import { prisma } from "@/lib/prisma";
import { normalizeFamilyColors, type FamilyColors } from "@/lib/familyColors";

let ensured: Promise<void> | null = null;
function ensureTable(): Promise<void> {
  if (!ensured) {
    ensured = prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "household_colors" ("householdId" TEXT NOT NULL, "colors" TEXT NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "household_colors_pkey" PRIMARY KEY ("householdId"))`
    ).then(() => undefined).catch((err) => { ensured = null; throw err; });
  }
  return ensured;
}

export async function getFamilyColors(householdId: string): Promise<FamilyColors> {
  try {
    await ensureTable();
    const rows = await prisma.$queryRaw<{ colors: string }[]>`SELECT "colors" FROM "household_colors" WHERE "householdId" = ${householdId} LIMIT 1`;
    return normalizeFamilyColors(rows[0] ? JSON.parse(rows[0].colors) : null);
  } catch (err) {
    console.error("getFamilyColors failed:", err);
    return normalizeFamilyColors(null);
  }
}

export async function saveFamilyColors(householdId: string, colors: FamilyColors): Promise<void> {
  await ensureTable();
  const json = JSON.stringify(colors);
  await prisma.$executeRaw`INSERT INTO "household_colors" ("householdId", "colors", "updatedAt") VALUES (${householdId}, ${json}, CURRENT_TIMESTAMP)
    ON CONFLICT ("householdId") DO UPDATE SET "colors" = EXCLUDED."colors", "updatedAt" = CURRENT_TIMESTAMP`;
}
