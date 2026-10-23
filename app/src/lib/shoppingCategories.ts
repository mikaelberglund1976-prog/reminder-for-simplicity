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

// The starter categories every household gets. Ordered the way a typical
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
  // 2026-10-11 (Mikael): drinks get their own aisle, like in a big store.
  { slug: "drinks", label: "Drinks", icon: "🥤" },
  { slug: "household", label: "Household", icon: "🧻" },
  { slug: "other", label: "Other", icon: "📦" },
];

// English + Swedish keywords, since the app is English-first but the
// household is Swedish — see PRODUCT_SPEC.md §9 language decision.
const KEYWORD_MAP: Array<{ slug: string; words: string[] }> = [
  {
    slug: "drinks",
    words: [
      "water", "vatten", "mineralvatten", "kolsyrat", "juice", "saft", "soda", "läsk",
      "cola", "fanta", "sprite", "pepsi", "beer", "öl", "folköl", "wine", "vin",
      "cider", "energidryck", "energy drink", "sportdryck", "iste", "iced tea",
      "smoothie", "lemonade", "lemonad", "festis", "trocadero", "loka", "ramlösa",
      "drink", "dryck",
    ],
  },
  {
    slug: "produce",
    words: [
      "apple", "äpple", "banana", "banan", "orange", "apelsin", "grape", "vindruv",
      "tomato", "tomat", "cucumber", "gurka", "lettuce", "sallad", "salad",
      "potato", "potatis", "onion", "lök", "garlic", "vitlök", "carrot", "morot",
      "pepper", "paprika", "avocado", "avokado", "lemon", "citron", "lime",
      "berry", "bär", "strawberr", "jordgubb", "blueberr", "blåbär",
      "broccoli", "spinach", "spenat", "mushroom", "svamp", "fruit", "frukt",
      "vegetable", "grönsak", "cabbage", "kål", "melon", "päron", "pear",
      "zucchini", "squash", "selleri", "celery", "ingefära", "ginger",
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
      "lax", "shrimp", "räka", "räkor", "ham", "skinka", "meatball", "köttbulle",
      "färs", "filé", "torsk", "cod", "tuna", "tonfisk", "kalkon", "turkey",
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
      // 2026-10-23: so the quick-add row recognises them (row 56).
      "blöja", "blöjor", "diaper", "diapers", "våtservett", "våtservetter", "wet wipes",
      "kattmat", "hundmat", "kattsand", "pet food", "cat food", "dog food",
      "plåster", "tops", "bomullspads", "deodorant", "deo", "rakhyvel", "tamponger", "bindor",
    ],
  },
];

// 2026-10-11: was a plain substring match, which put "kycklingfilé" in Dairy
// ("fil"), "toast" in Dairy ("ost") and "shampoo" in Meat ("ham"). Now a
// keyword only counts against whole words of the item name:
//   pass 1 — a word equals the keyword or ENDS with it. Swedish compounds put
//            the head last ("mellanmjölk" is milk, "apelsinjuice" is juice,
//            "vattenmelon" is melon), so this wins over…
//   pass 2 — a word STARTS with the keyword ("kycklingfilé", "apples").
// Keywords of 1–2 letters ("te", "öl") only match a whole word. Keywords with
// a space ("ice cream") match the name as a phrase.
const WORD_SPLIT = new RegExp("[^\\p{L}\\p{N}]+", "u");

export function guessCategorySlug(rawName: string): string | null {
  const name = rawName.trim().toLowerCase();
  if (!name) return null;
  const tokens = name.split(WORD_SPLIT).filter(Boolean);
  // Within a pass the longest matching keyword wins ("vindruvor" → "vindruv",
  // not "vin").
  const pass = (test: (tok: string, kw: string) => boolean): string | null => {
    let best: { slug: string; len: number } | null = null;
    for (const { slug, words } of KEYWORD_MAP) {
      for (const kw of words) {
        const hit = kw.includes(" ")
          ? name.includes(kw)
          : tokens.some((t) => t === kw || (kw.length > 2 && test(t, kw)));
        if (hit && (!best || kw.length > best.len)) best = { slug, len: kw.length };
      }
    }
    return best?.slug ?? null;
  };
  return pass((t, kw) => t.endsWith(kw)) ?? pass((t, kw) => t.startsWith(kw));
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
  if (existing.length > 0) return addNewDefaultsOnce(householdId, existing);

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

// 2026-10-11: a starter category added after a household was created (e.g.
// "Drinks") is added to that household once — right after its neighbour in
// DEFAULT_CATEGORIES — and never again, so a family that deletes it keeps it
// deleted. Skipped if the family already has a category with that name.
const ADDED_LATER: Record<string, string[]> = { drinks: ["drinks", "dryck", "drycker", "dricka"] };
let seedTable: Promise<void> | null = null;
function ensureSeedTable(): Promise<void> {
  if (!seedTable) {
    seedTable = (prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "shopping_category_seeds" ("householdId" TEXT NOT NULL, "slug" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "shopping_category_seeds_pkey" PRIMARY KEY ("householdId", "slug"))`
    ) as Promise<unknown>).then(() => undefined).catch((err: unknown) => { seedTable = null; throw err; });
  }
  return seedTable as Promise<void>;
}

async function addNewDefaultsOnce(householdId: string, existing: CategoryDef[]): Promise<CategoryDef[]> {
  const missing = Object.keys(ADDED_LATER).filter((slug) => !existing.some((c) => c.slug === slug));
  if (!missing.length) return existing;
  try {
    await ensureSeedTable();
    const done = await prisma.$queryRaw<{ slug: string }[]>`SELECT "slug" FROM "shopping_category_seeds" WHERE "householdId" = ${householdId}`;
    const todo = missing.filter((slug) => !done.some((d: { slug: string }) => d.slug === slug));
    if (!todo.length) return existing;
    let list = [...existing];
    for (const slug of todo) {
      const claimed = await prisma.$executeRaw`INSERT INTO "shopping_category_seeds" ("householdId", "slug") VALUES (${householdId}, ${slug}) ON CONFLICT DO NOTHING`;
      if (!claimed) continue; // another request got there first
      if (list.some((c) => ADDED_LATER[slug].includes(c.label.trim().toLowerCase()))) continue;
      const def = DEFAULT_CATEGORIES.find((d) => d.slug === slug)!;
      const idx = DEFAULT_CATEGORIES.findIndex((d) => d.slug === slug);
      const before = DEFAULT_CATEGORIES.slice(0, idx).map((d) => d.slug);
      const anchor = [...list].reverse().find((c) => c.slug && before.includes(c.slug));
      const sortOrder = anchor ? anchor.sortOrder + 1 : list.length;
      await prisma.$transaction([
        prisma.shoppingCategoryDef.updateMany({ where: { householdId, sortOrder: { gte: sortOrder } }, data: { sortOrder: { increment: 1 } } }),
        prisma.shoppingCategoryDef.create({ data: { householdId, slug, label: def.label, icon: def.icon, sortOrder } }),
      ]);
      list = await prisma.shoppingCategoryDef.findMany({ where: { householdId }, orderBy: { sortOrder: "asc" } });
    }
    return list;
  } catch (err) {
    console.error("addNewDefaultsOnce failed:", err);
    return existing;
  }
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
