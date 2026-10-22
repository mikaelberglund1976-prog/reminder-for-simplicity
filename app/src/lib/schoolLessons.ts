// 2026-10-22: timetable lessons from the school links, stored on their own.
// See lib/lessonPlan.ts for what counts as a lesson and how it's shown.
//
// Self-creating table (OPERATIONS.md §5a):
//   school_lessons — one row per lesson: which link and child it came from,
//                    the Stockholm day, start/end, the code ("MA") and room.
// Every sync replaces a link's lessons from a week ago and three weeks ahead,
// so a timetable that changes from week to week is always current.
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import type { Lesson } from "@/lib/lessonPlan";

export const LESSON_PAST_DAYS = 7;
export const LESSON_FUTURE_DAYS = 21;
const MAX_LESSONS_PER_FEED = 600;

let ensured: Promise<void> | null = null;
export function ensureLessonTable(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "school_lessons" ("id" TEXT NOT NULL, "feedId" TEXT NOT NULL, "childId" TEXT NOT NULL, "householdId" TEXT NOT NULL, "day" TEXT NOT NULL, "start" TEXT NOT NULL, "end" TEXT, "code" TEXT NOT NULL, "room" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "school_lessons_pkey" PRIMARY KEY ("id"))`
      );
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "school_lessons_child_day_idx" ON "school_lessons"("childId", "day")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "school_lessons_feed_idx" ON "school_lessons"("feedId")`);
    })().catch((err) => { ensured = null; throw err; });
  }
  return ensured;
}

/** Replace one link's lessons in [fromYmd, toYmd]. Lessons from two links for the same slot are de-duplicated on read. */
export async function replaceLessons(feed: { id: string; childId: string; householdId: string }, lessons: Lesson[], fromYmd: string, toYmd: string): Promise<number> {
  await ensureLessonTable();
  const seen = new Set<string>();
  const rows = lessons
    .filter((l) => l.day >= fromYmd && l.day <= toYmd)
    .filter((l) => { const k = `${l.day}|${l.start}|${l.code}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, MAX_LESSONS_PER_FEED);
  {
    const tx = prisma;
    await tx.$executeRaw`DELETE FROM "school_lessons" WHERE "feedId" = ${feed.id} AND "day" >= ${fromYmd} AND "day" <= ${toYmd}`;
    // Old weeks aren't needed for anything.
    await tx.$executeRaw`DELETE FROM "school_lessons" WHERE "feedId" = ${feed.id} AND "day" < ${fromYmd}`;
    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100);
      const ids = chunk.map(() => randomUUID());
      await tx.$executeRaw`INSERT INTO "school_lessons" ("id", "feedId", "childId", "householdId", "day", "start", "end", "code", "room")
        SELECT * FROM UNNEST(${ids}::text[], ${chunk.map(() => feed.id)}::text[], ${chunk.map(() => feed.childId)}::text[], ${chunk.map(() => feed.householdId)}::text[],
          ${chunk.map((l) => l.day)}::text[], ${chunk.map((l) => l.start)}::text[], ${chunk.map((l) => l.end)}::text[], ${chunk.map((l) => l.code)}::text[], ${chunk.map((l) => l.room)}::text[])`;
    }
  }
  return rows.length;
}

export async function deleteLessonsForFeed(feedId: string) {
  await ensureLessonTable();
  await prisma.$executeRaw`DELETE FROM "school_lessons" WHERE "feedId" = ${feedId}`;
}

/** Lessons per child in [fromYmd, toYmd], earliest first, same slot from two links shown once. */
export async function lessonsFor(childIds: string[], fromYmd: string, toYmd: string): Promise<Map<string, Lesson[]>> {
  const out = new Map<string, Lesson[]>(childIds.map((id) => [id, []]));
  if (!childIds.length) return out;
  await ensureLessonTable();
  const rows = await prisma.$queryRaw<(Lesson & { childId: string })[]>`SELECT "childId", "day", "start", "end", "code", "room" FROM "school_lessons" WHERE "childId" = ANY(${childIds}::text[]) AND "day" >= ${fromYmd} AND "day" <= ${toYmd} ORDER BY "day" ASC, "start" ASC`;
  const seen = new Set<string>();
  for (const r of rows) {
    const k = `${r.childId}|${r.day}|${r.start}|${r.code.toLowerCase()}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.get(r.childId)?.push({ day: r.day, start: r.start, end: r.end, code: r.code, room: r.room });
  }
  return out;
}
