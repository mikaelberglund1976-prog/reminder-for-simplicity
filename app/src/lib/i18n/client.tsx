"use client";

// 2026-10-04: the app's language on the client. The root layout decides the
// first language (cookie → browser) so the first paint is right; once someone
// is logged in, the family's language (set by a family admin) wins and is
// remembered in the cookie for next time.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DATE_LOCALES, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { getMessages, type Messages } from "./messages";
import { translateError } from "./errors";
import { formatDate, formatNumber, formatTime } from "./format";
import { getMe } from "@/lib/me";

type I18nValue = {
  locale: Locale;
  m: Messages;
  /** BCP 47 tag for Intl APIs (e.g. "sv-SE"). */
  dateLocale: string;
  setLocale: (l: Locale) => void;
  /** Translates an English error text from an API response. */
  err: (msg: unknown) => string;
  date: (d: Date | string | number, opts?: Intl.DateTimeFormatOptions) => string;
  time: (d: Date | string | number, opts?: Intl.DateTimeFormatOptions) => string;
  num: (n: number, opts?: Intl.NumberFormatOptions) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function writeLocaleCookie(l: Locale) {
  try {
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  } catch {
    /* ignore */
  }
}

export function I18nProvider({ initialLocale, children }: { initialLocale: Locale; children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((l: Locale) => {
    writeLocaleCookie(l);
    setLocaleState(l);
    try {
      document.documentElement.lang = l;
    } catch {
      /* ignore */
    }
  }, []);

  // Logged in → follow the family's language (it can be changed on another
  // device by a family admin). Public pages just keep the device's language.
  useEffect(() => {
    let alive = true;
    getMe().then((me) => {
      if (!alive || !me) return;
      const fam = (me as { language?: string | null }).language;
      if (isLocale(fam) && fam !== locale) setLocale(fam);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      m: getMessages(locale),
      dateLocale: DATE_LOCALES[locale],
      setLocale,
      err: (msg) => translateError(locale, msg),
      date: (d, opts) => formatDate(locale, d, opts),
      time: (d, opts) => formatTime(locale, d, opts),
      num: (n, opts) => formatNumber(locale, n, opts),
    }),
    [locale, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (ctx) return ctx;
  // Outside the provider (shouldn't happen) — fall back to English.
  const locale: Locale = "en";
  return {
    locale,
    m: getMessages(locale),
    dateLocale: DATE_LOCALES[locale],
    setLocale: () => {},
    err: (msg) => translateError(locale, msg),
    date: (d, opts) => formatDate(locale, d, opts),
    time: (d, opts) => formatTime(locale, d, opts),
    num: (n, opts) => formatNumber(locale, n, opts),
  };
}

/** Shorthand when a component only needs the texts. */
export function useM(): Messages {
  return useI18n().m;
}
