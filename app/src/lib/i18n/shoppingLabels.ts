// 2026-10-04: shopping categories are stored per household with the English
// default label. A category nobody has renamed is shown in the family's
// language; a renamed (or self-made) one is shown exactly as typed.
import { DEFAULT_CATEGORIES } from "@/lib/shoppingCategories";
import type { Messages } from "./messages";

const DEFAULT_EN = new Map(DEFAULT_CATEGORIES.map((c) => [c.slug, c.label]));

export function categoryLabel(c: { slug: string | null; label: string }, m: Messages): string {
  if (c.slug && DEFAULT_EN.get(c.slug) === c.label) return m.shopping.defaultCategories[c.slug] ?? c.label;
  return c.label;
}

/** Default list names are stored in English ("Shopping list", "Wishlist"). */
export function listName(name: string, m: Messages): string {
  const n = name.trim().toLowerCase();
  if (n === "shopping list") return m.shopping.defaultListName;
  if (n === "wishlist") return m.wishlist.defaultListName;
  return name;
}
