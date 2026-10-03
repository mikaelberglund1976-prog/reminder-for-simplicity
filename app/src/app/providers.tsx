"use client";

import { SessionProvider } from "next-auth/react";
import ImpersonationBar from "@/components/ImpersonationBar";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      {/* 2026-10-03: only renders while the admin is viewing as someone. */}
      <ImpersonationBar />
    </SessionProvider>
  );
}
