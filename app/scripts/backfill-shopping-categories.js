// One-off backfill for the 2026-07-27 "manage categories" change.
//
// What it does, per household:
//   1. Creates the 8 default ShoppingCategoryDef rows (idempotent — upsert on
//      the [householdId, slug] unique key, safe to re-run).
//   2. Sets ShoppingListItem.categoryId / ShoppingCategoryMemory.categoryId
//      from the old `category` enum column, wherever categoryId is still
//      null. Items whose old category was UNSORTED are left with
//      categoryId = null on purpose (there's no "Unsorted" row — null just
//      means uncategorized).
//
// Run locally (not in Cowork's sandbox — it can't reach the DB):
//   node scripts/backfill-shopping-categories.js
//
// Safe to run more than once. Does not touch or drop the old `category`
// column — that stays in place as deprecated/unused. See the comments on
// ShoppingListItem.category in prisma/schema.prisma.

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const DEFAULTS = [
  { slug: "produce", label: "Fruit & vegetables", icon: "🥦" },
  { slug: "bread", label: "Bread", icon: "🍞" },
  { slug: "dairy", label: "Dairy", icon: "🥛" },
  { slug: "meat_fish", label: "Meat & fish", icon: "🍗" },
  { slug: "frozen", label: "Frozen", icon: "🧊" },
  { slug: "pantry", label: "Pantry", icon: "🥫" },
  { slug: "household", label: "Household", icon: "🧻" },
  { slug: "other", label: "Other", icon: "📦" },
];

const ENUM_TO_SLUG = {
  PRODUCE: "produce",
  BREAD: "bread",
  DAIRY: "dairy",
  MEAT_FISH: "meat_fish",
  FROZEN: "frozen",
  PANTRY: "pantry",
  HOUSEHOLD: "household",
  OTHER: "other",
  // UNSORTED intentionally has no slug — stays categoryId = null.
};

async function main() {
  const households = await prisma.household.findMany({ select: { id: true, name: true } });
  console.log(`Found ${households.length} household(s).`);

  let itemsUpdated = 0;
  let memoryUpdated = 0;

  for (const household of households) {
    const slugToId = {};
    for (let i = 0; i < DEFAULTS.length; i++) {
      const def = DEFAULTS[i];
      const row = await prisma.shoppingCategoryDef.upsert({
        where: { householdId_slug: { householdId: household.id, slug: def.slug } },
        update: {},
        create: { householdId: household.id, slug: def.slug, label: def.label, icon: def.icon, sortOrder: i },
      });
      slugToId[def.slug] = row.id;
    }

    for (const [enumValue, slug] of Object.entries(ENUM_TO_SLUG)) {
      const categoryId = slugToId[slug];

      const itemResult = await prisma.shoppingListItem.updateMany({
        where: { householdId: household.id, category: enumValue, categoryId: null },
        data: { categoryId },
      });
      itemsUpdated += itemResult.count;

      const memoryResult = await prisma.shoppingCategoryMemory.updateMany({
        where: { householdId: household.id, category: enumValue, categoryId: null },
        data: { categoryId },
      });
      memoryUpdated += memoryResult.count;
    }

    console.log(`  ${household.name ?? household.id}: categories ready`);
  }

  console.log(`Done. Backfilled categoryId on ${itemsUpdated} shopping list item(s) and ${memoryUpdated} memory row(s).`);
  console.log(`Items left uncategorized (were UNSORTED) are unaffected — that's expected.`);
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
