import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { SwRegister } from "./sw-register";
import { VIEW_MODE_INIT_SCRIPT } from "@/lib/viewMode";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#1C1C28",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Reminder for Simplicity",
  description:
    "Everything your family needs to remember, buy, and want — reminders, a shared shopping list, and wishlists the kids control, all in one calm place. Free to get started.",
  keywords: ["reminder", "subscription", "birthday", "renewal", "shopping list", "wishlist", "family app", "notifications"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Reminder for Simplicity",
  },
  openGraph: {
    title: "Reminder for Simplicity",
    description: "Everything your family needs to remember, buy, and want — in one calm place.",
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        {/* Applies the saved mobile/web view preference before first paint,
            so there's no visible flash of the wrong width on load. */}
        <script dangerouslySetInnerHTML={{ __html: VIEW_MODE_INIT_SCRIPT }} />
      </head>
      <body className={inter.className}>
        <SwRegister />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
