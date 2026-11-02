// 2026-11-02 (Implementation Reality-review H-Reminder-21-001, finding 1):
// Row Level Security on every table in the public schema.
//
// Why: the app talks to Postgres only through Prisma, as the table owner.
// Supabase also exposes the public schema through its Data API (PostgREST)
// for the "anon"/"authenticated" roles. A table without RLS is readable and
// writable there for anyone holding the project's anon key. Turning RLS on
// with NO policies means "nobody through the Data API", while the app keeps
// working: a table's owner bypasses RLS (as long as FORCE isn't set, and we
// never set it).
//
// Safety: only tables owned by the role the app connects as (or when that
// role is superuser / BYPASSRLS) are touched, so the app can never lock
// itself out. Idempotent — runs at every build (scripts/enable-rls.js), in
// the daily cron (for tables created at runtime since), and from /admin/access.
import { prisma } from "@/lib/prisma";

export type RlsTable = { table: string; rls: boolean; owner: string; anonCanRead: boolean | null };
export type RlsStatus = {
  currentUser: string;
  bypass: boolean;
  tables: RlsTable[];
  withoutRls: string[];
  anonRoleExists: boolean;
};

const SAFE_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

export async function getRlsStatus(): Promise<RlsStatus> {
  const [role] = await prisma.$queryRawUnsafe<{ user: string; bypass: boolean; superuser: boolean }[]>(
    `SELECT current_user AS "user", r.rolbypassrls AS "bypass", r.rolsuper AS "superuser" FROM pg_roles r WHERE r.rolname = current_user`
  );
  const [anon] = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
    `SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') AS "exists"`
  );
  const anonExpr = anon?.exists ? `has_table_privilege('anon', c.oid, 'SELECT')` : `NULL::boolean`;
  const tables = await prisma.$queryRawUnsafe<RlsTable[]>(
    `SELECT c.relname AS "table", c.relrowsecurity AS "rls", pg_get_userbyid(c.relowner) AS "owner", ${anonExpr} AS "anonCanRead"
     FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
     ORDER BY c.relname`
  );
  return {
    currentUser: role?.user ?? "?",
    bypass: !!(role?.bypass || role?.superuser),
    tables,
    withoutRls: tables.filter((t) => !t.rls).map((t) => t.table),
    anonRoleExists: !!anon?.exists,
  };
}

/** Turns RLS on for every public table the app's role owns. Returns what happened. */
export async function enableRlsEverywhere(): Promise<{ enabled: string[]; skipped: string[]; remaining: string[] }> {
  const status = await getRlsStatus();
  const enabled: string[] = [];
  const skipped: string[] = [];
  for (const t of status.tables) {
    if (t.rls) continue;
    const ownsIt = t.owner === status.currentUser || status.bypass;
    if (!ownsIt || !SAFE_NAME.test(t.table)) { skipped.push(t.table); continue; }
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "public"."${t.table}" ENABLE ROW LEVEL SECURITY`);
      enabled.push(t.table);
    } catch (err) {
      console.error(`[rls] could not enable on ${t.table}:`, err);
      skipped.push(t.table);
    }
  }
  const after = await getRlsStatus();
  return { enabled, skipped, remaining: after.withoutRls };
}
