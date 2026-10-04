import type { Metadata } from "next";
import { getRequestLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";

// Shared shopping-list links are per-household secrets (unguessable token,
// same trust model as HouseholdInvite) — keep them out of search indexes.
export function generateMetadata(): Metadata {
  const m = getMessages(getRequestLocale());
  return {
    title: m.shopping.title,
    robots: { index: false, follow: false },
  };
}

export default function PublicShoppingListLayout({ children }: { children: React.ReactNode }) {
  return children;
}
