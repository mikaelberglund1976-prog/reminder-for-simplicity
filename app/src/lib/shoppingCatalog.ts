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
// 2026-08-18: expanded per Mikael's "borde vi kunna fylla på med vanligaste"
// feedback — still curated (common items only), just less likely to make
// someone reach for "New" to type something that's already a normal grocery
// item. Rendered as a compact list (see the shopping list's "Categories"
// tab), not chip bubbles, so a longer list here doesn't blow up the layout.

export const CATALOG_ITEMS: Record<string, string[]> = {
  produce: [
    "Bananas", "Apples", "Tomatoes", "Cucumber", "Potatoes", "Onion", "Garlic",
    "Lettuce", "Avocado", "Lemon", "Carrots", "Bell pepper", "Broccoli",
    "Spinach", "Mushrooms", "Grapes", "Oranges", "Strawberries", "Blueberries",
    "Cabbage", "Sweet potatoes", "Celery", "Ginger", "Lime",
  ],
  bread: [
    "Bread", "Bagels", "Tortillas", "Crispbread", "Buns", "Baguette",
    "Pita bread", "English muffins", "Croissants", "Rye bread",
  ],
  dairy: [
    "Milk", "Eggs", "Butter", "Cheese", "Yogurt", "Cream", "Quark",
    "Cream cheese", "Sour cream", "Cottage cheese", "Oat milk", "Parmesan",
  ],
  meat_fish: [
    "Chicken", "Minced meat", "Salmon", "Bacon", "Sausages", "Ground beef",
    "Pork chops", "Shrimp", "Ham", "Meatballs", "Turkey", "Tuna",
  ],
  frozen: [
    "Frozen berries", "Ice cream", "Frozen pizza", "Fish sticks",
    "Frozen vegetables", "French fries", "Frozen shrimp", "Frozen waffles",
  ],
  pantry: [
    "Pasta", "Rice", "Coffee", "Olive oil", "Sugar", "Flour",
    "Canned tomatoes", "Ketchup", "Tea", "Salt", "Black pepper", "Cereal",
    "Oats", "Honey", "Peanut butter", "Canned beans", "Mustard", "Mayonnaise",
    "Chocolate", "Crackers", "Nuts", "Vinegar", "Stock cubes", "Soy sauce",
  ],
  household: [
    "Toilet paper", "Paper towels", "Dish soap", "Laundry detergent",
    "Trash bags", "Toothpaste", "Shampoo", "Hand soap", "Aluminum foil",
    "Cling film", "Batteries", "Light bulbs", "Sponges", "Napkins",
  ],
  other: [],
};

// Slugs in the order they should render in the UI, skipping any with no
// curated items ("other" has none — it's a catch-all, not an aisle).
export const CATALOG_SLUG_ORDER: string[] = Object.keys(CATALOG_ITEMS).filter(
  (slug) => (CATALOG_ITEMS[slug] ?? []).length > 0
);
