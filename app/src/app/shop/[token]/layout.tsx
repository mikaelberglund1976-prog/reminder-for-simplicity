import type { Metadata } from "next";

// Shared shopping-list links are per-household secrets (unguessable token,
// same trust model as HouseholdInvite) — keep them out of search indexes.
export const metadata: Metadata = {
  title: "Shared shopping list",
  robots: { index: false, follow: false },
};

export default function PublicShoppingListLayout({ children }: { children: React.ReactNode }) {
  return children;
}
