import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ADMIN_EMAIL } from "@/lib/adminConfig";

// Admin helpers for /api/admin/ads (2026-09-28).
export async function isAdmin() {
  const session = await getServerSession(authOptions);
  return !!session?.user?.email && session.user.email === (process.env.ADMIN_EMAIL ?? ADMIN_EMAIL);
}

export function parseAd(body: Record<string, unknown>) {
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const date = (v: unknown) => (typeof v === "string" && v ? new Date(v) : null);
  const url = str(body.url);
  if (!str(body.title)) return { error: "Title is required" } as const;
  if (!url || !/^https?:\/\//i.test(url)) return { error: "Link must start with http:// or https://" } as const;
  const img = str(body.imageUrl);
  if (img && !/^https?:\/\//i.test(img)) return { error: "Image must be an http(s) URL" } as const;
  const placement = ["home", "shopping", "calendar", "any"].includes(String(body.placement)) ? String(body.placement) : "any";
  return {
    data: {
      title: str(body.title)!, body: str(body.body), imageUrl: img, url, ctaLabel: str(body.ctaLabel),
      advertiser: str(body.advertiser), placement, active: body.active !== false,
      startsAt: date(body.startsAt), endsAt: date(body.endsAt),
    },
  } as const;
}

