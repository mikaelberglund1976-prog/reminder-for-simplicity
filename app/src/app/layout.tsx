import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { SwRegister } from "./sw-register";
import { VIEW_MODE_INIT_SCRIPT } from "@/lib/viewMode";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { getRequestLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#F5F4F0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// 2026-10-04: title/description follow the visitor's language (cookie or browser).
export async function generateMetadata(): Promise<Metadata> {
  const meta = getMessages(getRequestLocale()).meta;
  return {
  title: "Reminder for Simplicity",
  description: meta.description,
  keywords: meta.keywords,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Reminder for Simplicity",
  },
  openGraph: {
    title: "Reminder for Simplicity",
    description: meta.ogDescription,
    type: "website",
  },
  icons: {
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 2026-10-04: first language from the device (cookie → browser); once logged
  // in, the family's language takes over (lib/i18n/client.tsx).
  const locale = getRequestLocale();
  return (
    <html lang={locale} data-theme="light" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        {/* Applies the saved mobile/web view preference before first paint,
            so there's no visible flash of the wrong width on load. */}
        <script dangerouslySetInnerHTML={{ __html: VIEW_MODE_INIT_SCRIPT }} />
        {/* Same idea for light/dark — applied before first paint (lib/theme.ts). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={inter.className}>
        <SwRegister />
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
