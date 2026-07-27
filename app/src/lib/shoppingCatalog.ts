// Curated "browse by aisle" catalog for quick-adding common items, shown in
// the shopping list's "Browse" panel — the equivalent of Listonic's "Katalog"
// tab, but a static list instead of a fetched product database (no external
// API/account needed). Tapping an item adds it straight to the list; the
// item still goes through the normal auto-categorize/remember flow.
//
// Kept intentionally short per category (8-10 items) so the panel stays
// scannable instead of turning into a supermarket inventory.

import { CATEGORY_ORDER, CATEGORY_LABELS, CATEGORY_ICONS } from "@/lib/shoppingCategories";
import type { ShoppingCategory } from "@prisma/client";

export const CATALOG_ITEMS: Record<ShoppingCategory, string[]> = {
  PRODUCE: ["Bananas", "Apples", "Tomatoes", "Cucumber", "Potatoes", "Onion", "Garlic", "Lettuce", "Avocado", "Lemon"],
  BREAD: ["Bread", "Bagels", "Tortillas", "Crispbread", "Buns"],
  DAIRY: ["Milk", "Eggs", "Butter", "Cheese", "Yogurt", "Cream", "Quark"],
  MEAT_FISH: ["Chicken", "Minced meat", "Salmon", "Bacon", "Sausages"],
  FROZEN: ["Frozen berries", "Ice cream", "Frozen pizza", "Fish sticks"],
  PANTRY: ["Pasta", "Rice", "Coffee", "Olive oil", "Sugar", "Flour", "Canned tomatoes", "Ketchup"],
  HOUSEHOLD: ["Toilet paper", "Paper towels", "Dish soap", "Laundry detergent", "Trash bags", "Toothpaste"],
  OTHER: [],
  UNSORTED: [],
};

export type CatalogCategory = ShoppingCategory;

// Categories in the order they should render in the UI, skipping any with
// no curated items (OTHER/UNSORTED have none — they're catch-alls, not aisles).
export const CATALOG_CATEGORY_ORDER: CatalogCategory[] = CATEGORY_ORDER.filter(
  (c) => (CATALOG_ITEMS[c as ShoppingCategory] ?? []).length > 0
);

export { CATEGORY_LABELS as CATALOG_CATEGORY_LABELS, CATEGORY_ICONS as CATALOG_CATEGORY_ICONS };
