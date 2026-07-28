// One-off backfill for the 2026-07-27 "multiple lists + who can see them"
// change. Creates a default List row for the household's existing shopping
// list and for each child's existing wishlist, then points existing items
// at them via the new listId column.
//
// Run locally (not in Cowork's sandbox — it can't reach the DB):
//   node scripts/backfill-lists.js
//
// Safe to run more than once — reuses an existing default list instead of
// creating a duplicate, and only touches items where listId is still null.

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function ensureShoppingList(household) {
  const existing = await prisma.list.findFirst({
    where: { householdId: household.id, kind: "SHOPPING" },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  const members = await prisma.householdMember.findMany({ where: { householdId: household.id } });
  const creator = members.find((m) => m.role === "OWNER" || m.role === "PARENT") ?? members[0];
  if (!creator) return null; // household with no members — nothing to backfill

  return prisma.list.create({
    data: {
      householdId: household.id,
      kind: "SHOPPING",
      name: "Shopping list",
      visibleToAll: true,
      shareToken: household.shoppingListShareToken ?? undefined,
      createdBy: creator.userId,
    },
  });
}

async function ensureWishlist(householdId, childUserId) {
  const existing = await prisma.list.findFirst({
    where: { householdId, kind: "WISHLIST", ownerId: childUserId },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  return prisma.list.create({
    data: {
      householdId,
      kind: "WISHLIST",
      name: "Wishlist",
      ownerId: childUserId,
      visibleToAll: true,
      createdBy: childUserId,
    },
  });
}

async function main() {
  const households = await prisma.household.findMany();
  console.log(`Found ${households.length} household(s).`);

  let shoppingItemsUpdated = 0;
  let wishlistItemsUpdated = 0;

  for (const household of households) {
    const shoppingList = await ensureShoppingList(household);
    if (shoppingList) {
      const res = await prisma.shoppingListItem.updateMany({
        where: { householdId: household.id, listId: null },
        data: { listId: shoppingList.id },
      });
      shoppingItemsUpdated += res.count;
    }

    const children = await prisma.householdMember.findMany({
      where: { householdId: household.id, role: "CHILD" },
    });
    for (const child of children) {
      const wishlist = await ensureWishlist(household.id, child.userId);
      const res = await prisma.wishlistItem.updateMany({
        where: { householdId: household.id, childId: child.userId, listId: null },
        data: { listId: wishlist.id },
      });
      wishlistItemsUpdated += res.count;
    }

    console.log(`  ${household.name ?? household.id}: lists ready`);
  }

  console.log(`Done. Backfilled listId on ${shoppingItemsUpdated} shopping item(s) and ${wishlistItemsUpdated} wishlist item(s).`);
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
