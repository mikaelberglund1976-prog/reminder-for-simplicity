import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
    // 2026-10-03: set while the admin is viewing the app as someone else.
    impersonator?: { name: string | null; email: string; until: number };
  }
}
