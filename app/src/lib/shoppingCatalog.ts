// Curated "browse by aisle" catalog for quick-adding common items, shown in
// the shopping list's "Browse" panel — the equivalent of Listonic's "Katalog"
// tab, but a static list instead of a fetched product database (no external
// API/account needed). Tapping an item adds it straight to the list; the
// item still goes through the normal auto-categorize/remember flow.
//
// Keyed by the default category `slug` (see shoppingCategories.ts) rather
// than a household-specific categoryId, since this catalog is the same for
// everyone regardless of how a household has renamed its categories. The UI
// matches a household's own category by slug to show the right label/icon.
//
// Kept intentionally short per category (8-10 items) so the panel stays
// scannable instead of turning into a supermarket inventory.

export const CATALOG_ITEMS: Record<string, string[]> = {
  produce: ["Bananas", "Apples", "Tomatoes", "Cucumber", "Potatoes", "Onion", "Garlic", "Lettuce", "Avocado", "Lemon"],
  bread: ["Bread", "Bagels", "Tortillas", "Crispbread", "Buns"],
  dairy: ["Milk", "Eggs", "Butter", "Cheese", "Yogurt", "Cream", "Quark"],
  meat_fish: ["Chicken", "Minced meat", "Salmon", "Bacon", "Sausages"],
  frozen: ["Frozen berries", "Ice cream", "Frozen pizza", "Fish sticks"],
  pantry: ["Pasta", "Rice", "Coffee", "Olive oil", "Sugar", "Flour", "Canned tomatoes", "Ketchup"],
  household: ["Toilet paper", "Paper towels", "Dish soap", "Laundry detergent", "Trash bags", "Toothpaste"],
  other: [],
};

// Slugs in the order they should render in the UI, skipping any with no
// curated items ("other" has none — it's a catch-all, not an aisle).
export const CATALOG_SLUG_ORDER: string[] = Object.keys(CATALOG_ITEMS).filter(
  (slug) => (CATALOG_ITEMS[slug] ?? []).length > 0
);
