import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AssistIQ — Never forget what matters",
  description:
    "Your personal life assistant for subscriptions, reminders, birthdays, and everything else that matters. Free to get started.",
  keywords: ["reminder", "subscription", "birthday", "renewal", "notifications", "assistant"],
  openGraph: {
    title: "AssistIQ",
    description: "Never forget what matters.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
