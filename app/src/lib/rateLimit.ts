// Rate limiter for login attempts and other guessable endpoints.
//
// Built 2026-08-02 after a security review flagged that login had zero
// throttling — see OPERATIONS.md §8.
//
// 2026-11-02 (Implementation Reality-review H-Reminder-21-001, finding 7):
// the counters used to live in memory per serverless instance, so on Vercel
// an attacker could spread attempts over many instances. They now live in the
// database ("rate_limits"), shared by every instance. The key is stored as a
// sha256 hash, so the table never holds email addresses in clear text.
// If the database call fails, the in-memory counter below still applies —
// a database hiccup must never lock everyone out or open the door wide.
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000; // failures older than this don't count
const MAX_ATTEMPTS = 5; // failures allowed within the window before locking
const LOCKOUT_MS = 15 * 60 * 1000; // how long a lockout lasts

type Attempt = { count: number; firstAttempt: number; lockedUntil?: number };
const memory = new Map<string, Attempt>();

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

let ensured: Promise<void> | null = null;
function ensureTable(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "rate_limits" ("key" TEXT NOT NULL, "count" INTEGER NOT NULL DEFAULT 0, "firstAttempt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "lockedUntil" TIMESTAMP(3), CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key"))`
      );
      await prisma.$executeRawUnsafe(`ALTER TABLE "rate_limits" ENABLE ROW LEVEL SECURITY`);
    })().catch((err) => { ensured = null; throw err; });
  }
  return ensured;
}

function lockedMessage(lockedUntil: number, now: number) {
  const minutesLeft = Math.max(1, Math.ceil((lockedUntil - now) / 60000));
  return `Too many attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`;
}

/** Call before verifying a password/code. Throws a user-facing error if the key is locked out. */
export async function checkRateLimit(key: string): Promise<void> {
  const now = Date.now();
  const mem = memory.get(key);
  if (mem?.lockedUntil && mem.lockedUntil > now) throw new Error(lockedMessage(mem.lockedUntil, now));
  let lockedUntil: number | null = null;
  try {
    await ensureTable();
    const rows = await prisma.$queryRawUnsafe<{ lockedUntil: Date | null }[]>(
      `SELECT "lockedUntil" FROM "rate_limits" WHERE "key" = $1`, hashKey(key)
    );
    const l = rows[0]?.lockedUntil;
    if (l && l.getTime() > now) lockedUntil = l.getTime();
  } catch (err) {
    console.error("[rateLimit] check failed, using memory only:", err);
  }
  if (lockedUntil) throw new Error(lockedMessage(lockedUntil, now));
}

/** Call after a failed attempt. */
export async function recordFailedAttempt(key: string): Promise<void> {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || now - entry.firstAttempt > WINDOW_MS) memory.set(key, { count: 1, firstAttempt: now });
  else {
    entry.count += 1;
    if (entry.count >= MAX_ATTEMPTS) entry.lockedUntil = now + LOCKOUT_MS;
  }
  if (memory.size > 2000) memory.clear();
  try {
    await ensureTable();
    // One statement: start a new window if the old one is over, otherwise
    // count up and lock when the limit is reached.
    await prisma.$executeRawUnsafe(
      `INSERT INTO "rate_limits" ("key", "count", "firstAttempt") VALUES ($1, 1, NOW())
       ON CONFLICT ("key") DO UPDATE SET
         "count" = CASE WHEN "rate_limits"."firstAttempt" < NOW() - INTERVAL '15 minutes' THEN 1 ELSE "rate_limits"."count" + 1 END,
         "firstAttempt" = CASE WHEN "rate_limits"."firstAttempt" < NOW() - INTERVAL '15 minutes' THEN NOW() ELSE "rate_limits"."firstAttempt" END,
         "lockedUntil" = CASE
           WHEN "rate_limits"."firstAttempt" >= NOW() - INTERVAL '15 minutes' AND "rate_limits"."count" + 1 >= $2
           THEN NOW() + INTERVAL '15 minutes' ELSE "rate_limits"."lockedUntil" END`,
      hashKey(key), MAX_ATTEMPTS
    );
  } catch (err) {
    console.error("[rateLimit] record failed:", err);
  }
}

/** Call on success so a legitimate user isn't left half-counted. */
export async function clearRateLimit(key: string): Promise<void> {
  memory.delete(key);
  try {
    await ensureTable();
    await prisma.$executeRawUnsafe(`DELETE FROM "rate_limits" WHERE "key" = $1`, hashKey(key));
  } catch (err) {
    console.error("[rateLimit] clear failed:", err);
  }
}

/** Daily cron: drop rows that are neither locked nor inside a window. */
export async function purgeOldRateLimits(): Promise<number> {
  await ensureTable();
  return prisma.$executeRawUnsafe(
    `DELETE FROM "rate_limits" WHERE "firstAttempt" < NOW() - INTERVAL '1 day' AND ("lockedUntil" IS NULL OR "lockedUntil" < NOW())`
  );
}
