// 2026-10-09 (persona review — Leo, 11: "no points, no link to pocket money",
// decided 2026-08-02 in PRODUCT_SPEC 4b.3): one star per chore done (or
// approved) per week. Shown as this week's stars, all-time stars and a streak
// (weeks in a row with at least one star). A family can optionally set a
// pocket-money amount per star; nothing is paid out by the app, it's a number
// for the family to agree on. Stored in a self-creating table (no DB step).
import { prisma } from "@/lib/prisma";

let ensured: Promise<void> | null = null;
function ensureTable(): Promise<void> {
  if (!ensured) {
    ensured = prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "chore_rewards" ("householdId" TEXT NOT NULL, "perStar" INTEGER NOT NULL DEFAULT 0, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "chore_rewards_pkey" PRIMARY KEY ("householdId"))`
    ).then(() => undefined).catch((err) => { ensured = null; throw err; });
  }
  return ensured;
}

export async function getPerStar(householdId: string): Promise<number> {
  try {
    await ensureTable();
    const rows = await prisma.$queryRawUnsafe<{ perStar: number }[]>(`SELECT "perStar" FROM "chore_rewards" WHERE "householdId" = $1`, householdId);
    return rows[0]?.perStar ?? 0;
  } catch (err) {
    console.error("chore_rewards read failed:", err);
    return 0;
  }
}

export async function setPerStar(householdId: string, perStar: number) {
  await ensureTable();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "chore_rewards" ("householdId", "perStar", "updatedAt") VALUES ($1, $2, CURRENT_TIMESTAMP)
     ON CONFLICT ("householdId") DO UPDATE SET "perStar" = EXCLUDED."perStar", "updatedAt" = CURRENT_TIMESTAMP`,
    householdId, perStar
  );
}

export function weekStartUtc(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export type StarStats = { userId: string; week: number; total: number; streak: number; lastWeek: number };

export async function starStats(householdId: string, userIds: string[], now = new Date()): Promise<StarStats[]> {
  const rows = await prisma.choreCompletion.findMany({
    where: { childId: { in: userIds }, status: { in: ["DONE", "APPROVED"] }, reminder: { householdId, category: "CHORE" } },
    select: { childId: true, weekStart: true },
  });
  const thisWeek = weekStartUtc(now).getTime();
  const WEEK = 7 * 86400000;
  return userIds.map((uid) => {
    const mine = rows.filter((r) => r.childId === uid);
    const perWeek = new Map<number, number>();
    for (const r of mine) {
      const k = weekStartUtc(r.weekStart).getTime();
      perWeek.set(k, (perWeek.get(k) ?? 0) + 1);
    }
    // Streak: weeks in a row with ≥1 star, counting back from this week (or
    // last week, if nothing is ticked yet this week — the week isn't over).
    let streak = 0;
    let k = perWeek.get(thisWeek) ? thisWeek : thisWeek - WEEK;
    while (perWeek.get(k)) { streak++; k -= WEEK; }
    return { userId: uid, week: perWeek.get(thisWeek) ?? 0, lastWeek: perWeek.get(thisWeek - WEEK) ?? 0, total: mine.length, streak };
  });
}
