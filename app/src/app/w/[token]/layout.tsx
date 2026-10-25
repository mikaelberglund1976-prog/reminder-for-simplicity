import type { Metadata } from "next";
import { getRequestLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";

// 2026-10-25: shared wishlist links are secrets — keep them out of search engines.
export function generateMetadata(): Metadata {
  const m = getMessages(getRequestLocale());
  return { title: m.wishLink.pageTitle, robots: { index: false, follow: false } };
}

export default function SharedWishlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
