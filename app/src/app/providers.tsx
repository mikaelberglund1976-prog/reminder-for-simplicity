"use client";

import { SessionProvider } from "next-auth/react";
import ImpersonationBar from "@/components/ImpersonationBar";
import { I18nProvider } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/config";

export function Providers({ children, locale }: { children: React.ReactNode; locale: Locale }) {
  return (
    <SessionProvider>
      <I18nProvider initialLocale={locale}>
        {children}
        {/* 2026-10-03: only renders while the admin is viewing as someone. */}
        <ImpersonationBar />
      </I18nProvider>
    </SessionProvider>
  );
}
