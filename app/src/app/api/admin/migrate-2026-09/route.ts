import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// TEMPORARY one-off production migration for the 2026-09 release (accounts,
// deletion, homework, plans, ads). Removed again right after it has run.
// Raw, idempotent SQL so it works with both the old and the new app code;
// every change is additive (new nullable/defaulted columns, a new table, one
// NOT NULL dropped), so the running app keeps working while it runs.
//   GET ?token=…&step=status | schema | data
// Only the SHA-256 of the one-time token is in the code.
const TOKEN_SHA256 = "7f6dfa5277500942f0449f6586e7e3de00f25cdb1c6e5eb05753e82f4aa24617";

const SCHEMA_SQL = [
  `DO $$ BEGIN CREATE TYPE "SchoolKind" AS ENUM ('HOMEWORK', 'TEST', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deletionRequestedAt" TIMESTAMP(3), ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3), ADD COLUMN IF NOT EXISTS "deletedById" TEXT, ADD COLUMN IF NOT EXISTS "deletedFromHouseholdId" TEXT, ADD COLUMN IF NOT EXISTS "deletedRole" "HouseholdRole"`,
  `ALTER TABLE "reminders" ADD COLUMN IF NOT EXISTS "schoolKind" "SchoolKind", ADD COLUMN IF NOT EXISTS "subject" TEXT, ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3), ADD COLUMN IF NOT EXISTS "showInCalendar" BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE "family_trials" ALTER COLUMN "childId" DROP NOT NULL`,
  `ALTER TABLE "households" ADD COLUMN IF NOT EXISTS "proUntil" TIMESTAMP(3), ADD COLUMN IF NOT EXISTS "plan" TEXT, ADD COLUMN IF NOT EXISTS "proSource" TEXT, ADD COLUMN IF NOT EXISTS "proRequestedAt" TIMESTAMP(3), ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT, ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT, ADD COLUMN IF NOT EXISTS "adFreeUntil" TIMESTAMP(3)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "households_stripeCustomerId_key" ON "households"("stripeCustomerId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "households_stripeSubscriptionId_key" ON "households"("stripeSubscriptionId")`,
  `CREATE TABLE IF NOT EXISTS "ads" ("id" TEXT NOT NULL, "title" TEXT NOT NULL, "body" TEXT, "imageUrl" TEXT, "url" TEXT NOT NULL, "ctaLabel" TEXT, "advertiser" TEXT, "placement" TEXT NOT NULL DEFAULT 'any', "active" BOOLEAN NOT NULL DEFAULT true, "startsAt" TIMESTAMP(3), "endsAt" TIMESTAMP(3), "impressions" INTEGER NOT NULL DEFAULT 0, "clicks" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ads_pkey" PRIMARY KEY ("id"))`,
];

// Same as scripts/migrate-2026-09-retire-pin.js.
const DATA_SQL = [
  `UPDATE "users" SET "emailVerified" = NOW() WHERE "isChildProfile" = false AND "emailVerified" IS NULL AND "deletedAt" IS NULL`,
  `UPDATE "users" SET "pin" = NULL WHERE "pin" IS NOT NULL`,
  `UPDATE "users" SET "password" = NULL WHERE "isChildProfile" = true AND "emailVerified" IS NULL AND "password" IS NOT NULL`,
];

async function columns() {
  const rows = await prisma.$queryRawUnsafe<{ table_name: string; column_name: string }[]>(
    `SELECT table_name::text AS table_name, column_name::text AS column_name FROM information_schema.columns WHERE table_schema = 'public' AND (
      (table_name = 'users' AND column_name IN ('deletedAt','deletionRequestedAt')) OR
      (table_name = 'reminders' AND column_name IN ('schoolKind','showInCalendar')) OR
      (table_name = 'households' AND column_name IN ('proUntil','adFreeUntil')) OR
      (table_name = 'ads' AND column_name = 'id'))`
  );
  return rows.map((r) => `${r.table_name}.${r.column_name}`).sort();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  if (createHash("sha256").update(token).digest("hex") !== TOKEN_SHA256) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const step = url.searchParams.get("step") ?? "status";
  try {
    if (step === "schema") {
      for (const sql of SCHEMA_SQL) await prisma.$executeRawUnsafe(sql);
    } else if (step === "data") {
      const counts: number[] = [];
      for (const sql of DATA_SQL) counts.push(await prisma.$executeRawUnsafe(sql));
      const kids = await prisma.$queryRawUnsafe<{ name: string | null; email: string }[]>(
        `SELECT "name", "email" FROM "users" WHERE "isChildProfile" = true AND "emailVerified" IS NULL AND "deletedAt" IS NULL`
      );
      return NextResponse.json({ step, adultsVerified: counts[0], pinsCleared: counts[1], childPinsCleared: counts[2], childrenNeedingInvite: kids.length, columns: await columns() });
    }
    return NextResponse.json({ step, columns: await columns() });
  } catch (err) {
    return NextResponse.json({ step, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
