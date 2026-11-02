// 2026-11-02 (Implementation Reality-review H-Reminder-21-001, finding 1):
// runs at every build (see "build" in package.json) and turns Row Level
// Security ON for every table in the public schema that the app's database
// role owns. With no policies that blocks Supabase's Data API (anon /
// authenticated) completely, while the app — connecting as the owner through
// Prisma — is not affected. Same logic as src/lib/dbSecurity.ts.
//
// Never fails the build: any error is logged and the script exits 0.
// Prints only table names and counts — no connection strings or data.

const { PrismaClient } = require("@prisma/client");

const SAFE_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("[rls] DATABASE_URL not set — skipping");
    return;
  }
  const prisma = new PrismaClient();
  try {
    const [role] = await prisma.$queryRawUnsafe(
      `SELECT current_user AS "user", r.rolbypassrls AS "bypass", r.rolsuper AS "superuser" FROM pg_roles r WHERE r.rolname = current_user`
    );
    const bypass = !!(role && (role.bypass || role.superuser));
    const tables = await prisma.$queryRawUnsafe(
      `SELECT c.relname AS "table", c.relrowsecurity AS "rls", pg_get_userbyid(c.relowner) AS "owner"
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') ORDER BY c.relname`
    );
    const before = tables.filter((t) => !t.rls).map((t) => t.table);
    console.log(`[rls] role=${role && role.user} bypass=${bypass} tables=${tables.length} withoutRls=${before.length}`);
    const enabled = [];
    const skipped = [];
    for (const t of tables) {
      if (t.rls) continue;
      if ((t.owner !== (role && role.user) && !bypass) || !SAFE_NAME.test(t.table)) { skipped.push(t.table); continue; }
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "public"."${t.table}" ENABLE ROW LEVEL SECURITY`);
        enabled.push(t.table);
      } catch (err) {
        skipped.push(t.table);
        console.log(`[rls] could not enable on ${t.table}: ${err && err.message ? err.message.split("\n")[0] : err}`);
      }
    }
    if (enabled.length) console.log(`[rls] enabled on ${enabled.length}: ${enabled.join(", ")}`);
    if (skipped.length) console.log(`[rls] SKIPPED ${skipped.length} (not owned by app role): ${skipped.join(", ")}`);
    console.log(`[rls] done — tables without RLS now: ${before.length - enabled.length}`);
  } finally {
    await prisma.$disconnect();
  }
}

const timer = setTimeout(() => { console.log("[rls] timed out — continuing build"); process.exit(0); }, 30000);
main()
  .catch((err) => console.log(`[rls] error (build continues): ${err && err.message ? err.message.split("\n")[0] : err}`))
  .finally(() => { clearTimeout(timer); process.exit(0); });
