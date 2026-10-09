// 2026-10-09: storage for Home preferences (lib/homePrefs.ts). Self-creating
// side table like reminder_times / school_feeds — no manual database step.
import { prisma } from "@/lib/prisma";
import { normalizeHomePrefs, type HomePrefs } from "@/lib/homePrefs";

let ensured: Promise<void> | null = null;
function ensureTable(): Promise<void> {
  if (!ensured) {
    ensured = prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "user_home_prefs" ("userId" TEXT NOT NULL, "prefs" TEXT NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "user_home_prefs_pkey" PRIMARY KEY ("userId"))`
    ).then(() => undefined).catch((err) => { ensured = null; throw err; });
  }
  return ensured;
}

export async function getHomePrefs(userId: string): Promise<HomePrefs> {
  try {
    await ensureTable();
    const rows = await prisma.$queryRaw<{ prefs: string }[]>`SELECT "prefs" FROM "user_home_prefs" WHERE "userId" = ${userId} LIMIT 1`;
    return normalizeHomePrefs(rows[0] ? JSON.parse(rows[0].prefs) : null);
  } catch (err) {
    console.error("getHomePrefs failed:", err);
    return normalizeHomePrefs(null);
  }
}

export async function saveHomePrefs(userId: string, prefs: HomePrefs): Promise<void> {
  await ensureTable();
  const json = JSON.stringify(prefs);
  await prisma.$executeRaw`INSERT INTO "user_home_prefs" ("userId", "prefs", "updatedAt") VALUES (${userId}, ${json}, CURRENT_TIMESTAMP)
    ON CONFLICT ("userId") DO UPDATE SET "prefs" = EXCLUDED."prefs", "updatedAt" = CURRENT_TIMESTAMP`;
}
