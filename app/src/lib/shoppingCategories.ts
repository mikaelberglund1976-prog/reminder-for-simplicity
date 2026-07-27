// Auto-categorization + category management for the shared shopping list.
//
// 2026-07-27: categories moved from a fixed ShoppingCategory enum to
// household-editable rows (ShoppingCategoryDef) so a household can add a
// missing category and rename existing ones. See prisma/schema.prisma and
// scripts/backfill-shopping-categories.js for the migration.
//
// Two-step lookup on every add:
//   1. Has this household categorized an item with this exact name before?
//      -> reuse that choice (ShoppingCategoryMemory).
//   2. Otherwise, guess from a keyword list, matched against the household's
//      own category rows via a stable `slug` (renaming a category doesn't
//      break the guess).
//   3. Otherwise, uncategorized (categoryId = null) — the user can set it
//      manually and we'll remember it next time.

import { prisma } from "@/lib/prisma";

export type CategoryDef = {
  id: string;
  slug: string | null;
  label: string;
  icon: string;
  sortOrder: number;
};

// The 8 starter categories every household gets. Ordered the way a typical
// store is laid out, so grouped lists read naturally. Slugs are stable
// identifiers used for keyword auto-guessing — renaming `label` never
// changes `slug`. Custom categories a household adds themselves have
// slug = null and just sort after these by creation order.
export const DEFAULT_CATEGORIES: { slug: string; label: string; icon: string }[] = [
  { slug: "produce", label: "Fruit & vegetables", icon: "🥦" },
  { slug: "bread", label: "Bread", icon: "🍞" },
  { slug: "dairy", label: "Dairy", icon: "🥛" },
  { slug: "meat_fish", label: "Meat & fish", icon: "🍗" },
  { slug: "frozen", label: "Frozen", icon: "🧊" },
  { slug: "pantry", label: "Pantry", icon: "🥫" },
  { slug: "household", label: "Household", icon: "🧻" },
  { slug: "other", label: "Other", icon: "📦" },
];

// English + Swedish keywords, since the app is English-first but the
// household is Swedish — see PRODUCT_SPEC.md §9 language decision.
const KEYWORD_MAP: Array<{ slug: string; words: string[] }> = [
  {
    slug: "produce",
    words: [
      "apple", "äpple", "banana", "banan", "orange", "apelsin", "grape", "vindruv",
      "tomato", "tomat", "cucumber", "gurka", "lettuce", "sallad", "salad",
      "potato", "potatis", "onion", "lök", "garlic", "vitlök", "carrot", "morot",
      "pepper", "paprika", "avocado", "avokado", "lemon", "citron", "lime",
      "berry", "bär", "strawberr", "jordgubb", "blueberr", "blåbär",
      "broccoli", "spinach", "spenat", "mushroom", "svamp", "fruit", "frukt",
      "vegetable", "grönsak", "cabbage", "kål",
    ],
  },
  {
    slug: "dairy",
    words: [
      "milk", "mjölk", "cheese", "ost", "yogurt", "yoghurt", "butter",
      "smör", "cream", "grädde", "egg", "ägg", "quark", "kvarg", "fil",
      "creme fraiche", "crème fraîche", "philadelphia",
    ],
  },
  {
    slug: "bread",
    words: ["bread", "bröd", "bun", "bulle", "bagel", "baguette", "toast", "tortilla", "roll", "limpa", "knäckebröd", "crispbread"],
  },
  {
    slug: "frozen",
    words: ["frozen", "fryst", "ice cream", "glass", "fish sticks", "fiskpinnar", "pizza", "berries frozen"],
  },
  {
    slug: "meat_fish",
    words: [
      "chicken", "kyckling", "beef", "nötkött", "pork", "fläsk", "meat", "kött",
      "mince", "köttfärs", "sausage", "korv", "bacon", "fish", "fisk", "salmon",
      "lax", "shrimp", "räka", "ham", "skinka", "meatball", "köttbulle",
    ],
  },
  {
    slug: "pantry",
    words: [
      "pasta", "rice", "ris", "flour", "mjöl", "sugar", "socker", "salt", "oil",
      "olja", "vinegar", "vinäger", "cereal", "flingor", "coffee", "kaffe",
      "tea", "te", "spice", "krydda", "can", "burk", "sauce", "sås", "ketchup",
      "mustard", "senap", "jam", "sylt", "honey", "honung", "nuts", "nötter",
      "snack", "chip", "chips", "chocolate", "choklad", "candy", "godis",
      "bean", "böna", "lentil", "lins",
    ],
  },
  {
    slug: "household",
    words: [
      "soap", "tvål", "detergent", "tvättmedel", "toilet paper", "toapapper",
      "paper towel", "hushållspapper", "tissue", "napkin", "servett", "sponge",
      "diskborste", "trash bag", "sopsäck", "battery", "batteri", "light bulb",
      "lampa", "shampoo", "schampo", "toothpaste", "tandkräm", "cleaning",
      "rengöring", "foil", "folie", "plastic wrap", "plastfolie",
    ],
  },
];

export function guessCategorySlug(rawName: string): string | null {
  const name = rawName.trim().toLowerCase();
  if (!name) return null;
  for (const { slug, words } of KEYWORD_MAP) {
    if (words.some((w) => name.includes(w))) return slug;
  }
  return null;
}

function normalizeItemName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Returns a household's categories, sorted for display. Lazily seeds the 8
 * defaults on first use — covers households created before the backfill
 * script ran, and any created after this feature shipped.
 */
export async function ensureHouseholdCategories(householdId: string): Promise<CategoryDef[]> {
  const existing = await prisma.shoppingCategoryDef.findMany({
    where: { householdId },
    orderBy: { sortOrder: "asc" },
  });
  if (existing.length > 0) return existing;

  await prisma.$transaction(
    DEFAULT_CATEGORIES.map((def, i) =>
      prisma.shoppingCategoryDef.upsert({
        where: { householdId_slug: { householdId, slug: def.slug } },
        update: {},
        create: { householdId, slug: def.slug, label: def.label, icon: def.icon, sortOrder: i },
      })
    )
  );

  return prisma.shoppingCategoryDef.findMany({ where: { householdId }, orderBy: { sortOrder: "asc" } });
}

/**
 * Resolve the categoryId for a newly-added item: household memory first,
 * then a keyword guess against the household's own categories, then null
 * (uncategorized).
 */
export async function resolveCategoryId(householdId: string, name: string): Promise<string | null> {
  const key = normalizeItemName(name);
  if (!key) return null;

  const remembered = await prisma.shoppingCategoryMemory.findUnique({
    where: { householdId_itemName: { householdId, itemName: key } },
  });
  if (remembered) return remembered.categoryId;

  const slug = guessCategorySlug(name);
  if (!slug) return null;

  const defs = await ensureHouseholdCategories(householdId);
  return defs.find((d) => d.slug === slug)?.id ?? null;
}

/**
 * Call whenever a user explicitly sets/changes an item's category, so the
 * household doesn't have to re-categorize the same item next time.
 */
export async function rememberCategory(householdId: string, name: string, categoryId: string | null): Promise<void> {
  const key = normalizeItemName(name);
  if (!key) return;

  await prisma.shoppingCategoryMemory.upsert({
    where: { householdId_itemName: { householdId, itemName: key } },
    update: { categoryId },
    create: { householdId, itemName: key, categoryId, category: "UNSORTED" },
  });
}
