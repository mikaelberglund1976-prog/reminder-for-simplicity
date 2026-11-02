// 2026-11-02 (Mikael: "man måste ha en inbjudningskod eller liknande som man
// kan hantera från admin konsolen ... för att bara kunna släppa in de jag
// vill"). Feedback R-5 / C-09: kontrollager för nya användare.
//
// Who needs a code: anyone creating a NEW account who
//   - is not the admin (ADMIN_EMAIL), and
//   - has no pending family invite (a family invite is the account owner
//     vouching for them — B-013 — so it works without a code).
// Applies to email sign-up (/api/auth/register) and first-time Google sign-in
// (lib/auth.ts, the code travels in a short-lived cookie set by
// /api/auth/signup-code). Existing accounts are never affected.
//
// Codes are managed at /admin/access: create (own text or generated), limit
// uses, set an expiry, pause, delete, see who used each one.
// Turned on by default; REQUIRE_INVITE_CODE=false in Vercel turns it off.
//
// Tables are created on first use (same pattern as the rest of lib/) and get
// Row Level Security straight away.
import { randomBytes, randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export const INVITE_CODE_REQUIRED = process.env.REQUIRE_INVITE_CODE !== "false";
export const SIGNUP_CODE_COOKIE = "signup_code";

export const INVITE_CODE_REQUIRED_MESSAGE = "An invite code is required to create an account.";
export const INVITE_CODE_INVALID_MESSAGE = "That invite code isn't valid (wrong, used up, paused or expired).";

export type SignupCode = {
  id: string;
  code: string;
  note: string | null;
  maxUses: number | null;
  uses: number;
  expiresAt: Date | null;
  active: boolean;
  createdAt: Date;
};
export type SignupCodeUse = { codeId: string; userId: string | null; email: string; createdAt: Date };

let ensured: Promise<void> | null = null;
export function ensureSignupCodeTables(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "signup_codes" ("id" TEXT NOT NULL, "code" TEXT NOT NULL, "note" TEXT, "maxUses" INTEGER, "uses" INTEGER NOT NULL DEFAULT 0, "expiresAt" TIMESTAMP(3), "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "signup_codes_pkey" PRIMARY KEY ("id"))`
      );
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "signup_codes_code_key" ON "signup_codes" ("code")`);
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "signup_code_uses" ("id" TEXT NOT NULL, "codeId" TEXT NOT NULL, "userId" TEXT, "email" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "signup_code_uses_pkey" PRIMARY KEY ("id"))`
      );
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "signup_code_uses_code" ON "signup_code_uses" ("codeId")`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "signup_codes" ENABLE ROW LEVEL SECURITY`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "signup_code_uses" ENABLE ROW LEVEL SECURITY`);
    })().catch((err) => { ensured = null; throw err; });
  }
  return ensured;
}

/** Codes are compared without case, spaces or dashes: "abcd-2345" = "ABCD2345". */
export function normalizeCode(raw: unknown): string {
  return typeof raw === "string" ? raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 40) : "";
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I
export function generateCode(): string {
  const bytes = randomBytes(8);
  let s = "";
  for (let i = 0; i < 8; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return s;
}

/** For display: ABCD2345 → ABCD-2345. */
export function formatCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

const USABLE = `"active" = true AND ("expiresAt" IS NULL OR "expiresAt" > NOW()) AND ("maxUses" IS NULL OR "uses" < "maxUses")`;

/** Is this code usable right now? (Does not use it up.) */
export async function isCodeUsable(raw: unknown): Promise<boolean> {
  const code = normalizeCode(raw);
  if (code.length < 4) return false;
  await ensureSignupCodeTables();
  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT "id" FROM "signup_codes" WHERE "code" = $1 AND ${USABLE} LIMIT 1`, code
  );
  return rows.length > 0;
}

/**
 * Uses the code once, atomically (two people can't both take the last use).
 * Returns the code id, or null if it wasn't usable.
 */
export async function redeemCode(raw: unknown): Promise<string | null> {
  const code = normalizeCode(raw);
  if (code.length < 4) return null;
  await ensureSignupCodeTables();
  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `UPDATE "signup_codes" SET "uses" = "uses" + 1 WHERE "code" = $1 AND ${USABLE} RETURNING "id"`, code
  );
  return rows[0]?.id ?? null;
}

/** Gives a use back (account creation failed after the code was taken). */
export async function releaseCode(codeId: string): Promise<void> {
  await prisma.$executeRawUnsafe(`UPDATE "signup_codes" SET "uses" = GREATEST("uses" - 1, 0) WHERE "id" = $1`, codeId);
}

export async function recordCodeUse(codeId: string, userId: string | null, email: string): Promise<void> {
  await ensureSignupCodeTables();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "signup_code_uses" ("id", "codeId", "userId", "email") VALUES ($1, $2, $3, $4)`,
    randomUUID(), codeId, userId, email.toLowerCase()
  );
}

// ── Admin ───────────────────────────────────────────────────────────────────
export async function listCodes(): Promise<(SignupCode & { usedBy: SignupCodeUse[] })[]> {
  await ensureSignupCodeTables();
  const codes = await prisma.$queryRawUnsafe<SignupCode[]>(`SELECT * FROM "signup_codes" ORDER BY "createdAt" DESC`);
  const uses = await prisma.$queryRawUnsafe<SignupCodeUse[]>(
    `SELECT "codeId", "userId", "email", "createdAt" FROM "signup_code_uses" ORDER BY "createdAt" DESC`
  );
  return codes.map((c) => ({ ...c, uses: Number(c.uses), maxUses: c.maxUses == null ? null : Number(c.maxUses), usedBy: uses.filter((u) => u.codeId === c.id) }));
}

export type CodeInput = { code?: unknown; note?: unknown; maxUses?: unknown; expiresAt?: unknown; active?: unknown };

function parseFields(body: CodeInput) {
  const out: { note?: string | null; maxUses?: number | null; expiresAt?: Date | null; active?: boolean } = {};
  if (body.note !== undefined) out.note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 200) : null;
  if (body.maxUses !== undefined) {
    if (body.maxUses === null || body.maxUses === "") out.maxUses = null;
    else {
      const n = Number(body.maxUses);
      if (!Number.isInteger(n) || n < 1 || n > 100000) return { error: "Max uses must be a whole number from 1" } as const;
      out.maxUses = n;
    }
  }
  if (body.expiresAt !== undefined) {
    if (body.expiresAt === null || body.expiresAt === "") out.expiresAt = null;
    else {
      const d = new Date(String(body.expiresAt));
      if (isNaN(d.getTime())) return { error: "Invalid expiry date" } as const;
      out.expiresAt = d;
    }
  }
  if (body.active !== undefined) out.active = body.active === true;
  return { data: out } as const;
}

export async function createCode(body: CodeInput): Promise<{ code: string } | { error: string }> {
  await ensureSignupCodeTables();
  const wanted = body.code === undefined || body.code === "" ? generateCode() : normalizeCode(body.code);
  if (wanted.length < 4) return { error: "A code needs at least 4 letters or digits" };
  const parsed = parseFields(body);
  if ("error" in parsed) return { error: parsed.error as string };
  const f = parsed.data;
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "signup_codes" ("id", "code", "note", "maxUses", "expiresAt", "active") VALUES ($1, $2, $3, $4, $5, true)`,
      randomUUID(), wanted, f.note ?? null, f.maxUses ?? null, f.expiresAt ?? null
    );
  } catch {
    return { error: "That code already exists" };
  }
  return { code: wanted };
}

export async function updateCode(id: string, body: CodeInput): Promise<{ ok: true } | { error: string }> {
  await ensureSignupCodeTables();
  const parsed = parseFields(body);
  if ("error" in parsed) return { error: parsed.error as string };
  const f = parsed.data;
  const sets: string[] = [];
  const vals: unknown[] = [];
  const add = (col: string, v: unknown) => { vals.push(v); sets.push(`"${col}" = $${vals.length}`); };
  if (f.note !== undefined) add("note", f.note);
  if (f.maxUses !== undefined) add("maxUses", f.maxUses);
  if (f.expiresAt !== undefined) add("expiresAt", f.expiresAt);
  if (f.active !== undefined) add("active", f.active);
  if (!sets.length) return { error: "Nothing to update" };
  vals.push(id);
  const n = await prisma.$executeRawUnsafe(`UPDATE "signup_codes" SET ${sets.join(", ")} WHERE "id" = $${vals.length}`, ...vals);
  return n ? { ok: true } : { error: "Not found" };
}

/** Deleting a code doesn't touch the accounts made with it; the log of uses goes too. */
export async function deleteCode(id: string): Promise<boolean> {
  await ensureSignupCodeTables();
  await prisma.$executeRawUnsafe(`DELETE FROM "signup_code_uses" WHERE "codeId" = $1`, id);
  const n = await prisma.$executeRawUnsafe(`DELETE FROM "signup_codes" WHERE "id" = $1`, id);
  return n > 0;
}
