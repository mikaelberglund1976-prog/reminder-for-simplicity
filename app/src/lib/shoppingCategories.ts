// Auto-categorization for the shared shopping list (P0.2 in the 2026-07-27 order).
//
// Two-step lookup on every add:
//   1. Has this household categorized an item with this exact name before?
//      -> reuse that choice (ShoppingCategoryMemory).
//   2. Otherwise, guess from a keyword list.
//   3. Otherwise, UNSORTED — the user can set it manually and we'll remember it.
//
// Keeping this in one file makes it easy to extend the keyword list without
// touching the API routes.

import { prisma } from "@/lib/prisma";
import { ShoppingCategory } from "@prisma/client";

export const CATEGORY_LABELS: Record<ShoppingCategory, string> = {
  PRODUCE: "Fruit & vegetables",
  DAIRY: "Dairy",
  BREAD: "Bread",
  FROZEN: "Frozen",
  PANTRY: "Pantry",
  HOUSEHOLD: "Household",
  MEAT_FISH: "Meat & fish",
  OTHER: "Other",
  UNSORTED: "Unsorted",
};

// Small emoji per aisle, shown on the colored category header bar in the UI.
// Matches the existing app-wide convention of emoji category icons (BRAND.md §4).
export const CATEGORY_ICONS: Record<ShoppingCategory, string> = {
  PRODUCE: "🥦",
  DAIRY: "🥛",
  BREAD: "🍞",
  FROZEN: "🧊",
  PANTRY: "🥫",
  HOUSEHOLD: "🧻",
  MEAT_FISH: "🍗",
  OTHER: "📦",
  UNSORTED: "❔",
};

// Ordered the way a typical store is laid out, so grouped lists read naturally.
export const CATEGORY_ORDER: ShoppingCategory[] = [
  "PRODUCE",
  "BREAD",
  "DAIRY",
  "MEAT_FISH",
  "FROZEN",
  "PANTRY",
  "HOUSEHOLD",
  "OTHER",
  "UNSORTED",
];

// English + Swedish keywords, since the app is English-first but the
// household is Swedish — see PRODUCT_SPEC.md §9 language decision.
const KEYWORD_MAP: Array<{ category: ShoppingCategory; words: string[] }> = [
  {
    category: "PRODUCE",
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
    category: "DAIRY",
    words: [
      "milk", "mjölk", "cheese", "ost", "yogurt", "yoghurt", "yoghurt", "butter",
      "smör", "cream", "grädde", "egg", "ägg", "quark", "kvarg", "fil",
      "creme fraiche", "crème fraîche", "philadelphia",
    ],
  },
  {
    category: "BREAD",
    words: ["bread", "bröd", "bun", "bulle", "bagel", "baguette", "toast", "tortilla", "roll", "limpa", "knäckebröd", "crispbread"],
  },
  {
    category: "FROZEN",
    words: ["frozen", "fryst", "ice cream", "glass", "fish sticks", "fiskpinnar", "pizza", "berries frozen"],
  },
  {
    category: "MEAT_FISH",
    words: [
      "chicken", "kyckling", "beef", "nötkött", "pork", "fläsk", "meat", "kött",
      "mince", "köttfärs", "sausage", "korv", "bacon", "fish", "fisk", "salmon",
      "lax", "shrimp", "räka", "ham", "skinka", "meatball", "köttbulle",
    ],
  },
  {
    category: "PANTRY",
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
    category: "HOUSEHOLD",
    words: [
      "soap", "tvål", "detergent", "tvättmedel", "toilet paper", "toapapper",
      "paper towel", "hushållspapper", "tissue", "napkin", "servett", "sponge",
      "diskborste", "trash bag", "sopsäck", "battery", "batteri", "light bulb",
      "lampa", "shampoo", "schampo", "toothpaste", "tandkräm", "cleaning",
      "rengöring", "foil", "folie", "plastic wrap", "plastfolie",
    ],
  },
];

export function guessCategory(rawName: string): ShoppingCategory {
  const name = rawName.trim().toLowerCase();
  if (!name) return "UNSORTED";
  for (const { category, words } of KEYWORD_MAP) {
    if (words.some((w) => name.includes(w))) return category;
  }
  return "UNSORTED";
}

function normalizeItemName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Resolve the category for a newly-added item: household memory first,
 * then keyword guess, then UNSORTED.
 */
export async function resolveCategory(householdId: string, name: string): Promise<ShoppingCategory> {
  const key = normalizeItemName(name);
  if (!key) return "UNSORTED";

  const remembered = await prisma.shoppingCategoryMemory.findUnique({
    where: { householdId_itemName: { householdId, itemName: key } },
  });
  if (remembered) return remembered.category;

  return guessCategory(name);
}

/**
 * Call whenever a user explicitly sets/changes an item's category, so the
 * household doesn't have to re-categorize the same item next time.
 */
export async function rememberCategory(householdId: string, name: string, category: ShoppingCategory): Promise<void> {
  const key = normalizeItemName(name);
  if (!key) return;

  await prisma.shoppingCategoryMemory.upsert({
    where: { householdId_itemName: { householdId, itemName: key } },
    update: { category },
    create: { householdId, itemName: key, category },
  });
}
