// One-off migration for the 2026-09-27 "no more PIN, every account has a
// verified email" change. Run ONCE, locally, AFTER `npm run db:push`:
//   node scripts/migrate-2026-09-retire-pin.js
//
// What it does:
//  1. Adults who already use the app: marks their email as verified (they've
//     been receiving reminder emails at it all along), so nobody existing is
//     locked out by the new "confirm your email first" rule.
//  2. Clears every adult's optional PIN (User.pin).
//  3. Child profiles: their `password` field held the 4-digit PIN hash —
//     clears it and marks the email as unconfirmed, so they must use the
//     "confirm email & choose password" link. A parent sends it from
//     Profile → Child accounts → "Resend invite" (or the child can use
//     "Forgot password?" / Google).
//
// Safe to run more than once.

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const adults = await prisma.user.updateMany({
    where: { isChildProfile: false, emailVerified: null, deletedAt: null },
    data: { emailVerified: new Date() },
  });
  console.log(`Adults marked verified: ${adults.count}`);

  const pins = await prisma.user.updateMany({ where: { pin: { not: null } }, data: { pin: null } });
  console.log(`Adult PINs cleared: ${pins.count}`);

  // Only children that still have a 4-digit-PIN-style credential and never
  // went through the new setup flow (emailVerified is null for all of them
  // before this change).
  const children = await prisma.user.updateMany({
    where: { isChildProfile: true, emailVerified: null, password: { not: null } },
    data: { password: null },
  });
  console.log(`Child PIN credentials cleared: ${children.count}`);

  const list = await prisma.user.findMany({
    where: { isChildProfile: true, emailVerified: null },
    select: { name: true, email: true },
  });
  if (list.length) {
    console.log("\nThese child accounts need an invite (Profile → Child accounts → Resend invite):");
    for (const c of list) console.log(`  - ${c.name ?? "(no name)"} <${c.email}>`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
