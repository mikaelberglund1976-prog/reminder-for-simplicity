// 2026-10-04: languages. One place that lists which languages the app speaks.
//
// Adding a language later:
//   1. Add its code to LOCALES and its own name to LOCALE_NAMES / DATE_LOCALES.
//   2. Copy the folder messages/en to messages/<code> and translate every
//      string — TypeScript refuses to build until every key exists (type Messages).
//   3. Register it in messages/index.ts.
//   4. Add app/privacy/Privacy<Code>.tsx and pick it in app/privacy/page.tsx.
// Nothing else needs to change: the family setting, the language picker, emails
// and dates all read from these lists.

export const LOCALES = ["en", "sv"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Each language's name written in that language (what the picker shows). */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  sv: "Svenska",
};

/** BCP 47 tag used for Intl / toLocaleDateString. */
export const DATE_LOCALES: Record<Locale, string> = {
  en: "en-GB",
  sv: "sv-SE",
};

/** Cookie that remembers the language on this device (also used before login). */
export const LOCALE_COOKIE = "rfs_lang";

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

/** Picks a supported language from an Accept-Language header ("sv-SE,sv;q=0.9,en;q=0.8"). */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;
  const tags = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of tags) {
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return null;
}
