import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Reminder for Simplicity – Glöm aldrig det som spelar roll",
  description:
    "En enkel påminnelsetjänst för abonnemang, födelsedagar och allt annat viktigt. Helt gratis.",
  keywords: ["påminnelse", "abonnemang", "reminder", "födelsedag", "kalender"],
  openGraph: {
    title: "Reminder for Simplicity",
    description: "Glöm aldrig det som spelar roll.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
