// 2026-10-25 (masterbrief §8 step 4 "Share Sheet", Etapp 6 in the PWA): the
// installed app is a share target (manifest.json → share_target). Sharing a
// text, a link or a page title to Assistiq opens Home with it written into
// "Write anything" — nothing is saved until the person confirms, as always.
// Android/Chrome only; iOS doesn't offer web apps in the share sheet.
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function SharePage({ searchParams }: { searchParams: { title?: string; text?: string; url?: string } }) {
  const parts = [searchParams.title, searchParams.text, searchParams.url]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
  // Many apps put the same thing in title and text — keep it once.
  const uniq = parts.filter((p, i) => parts.indexOf(p) === i);
  const capture = uniq.join(" ").slice(0, 500);
  redirect(capture ? `/dashboard?capture=${encodeURIComponent(capture)}` : "/dashboard");
}
