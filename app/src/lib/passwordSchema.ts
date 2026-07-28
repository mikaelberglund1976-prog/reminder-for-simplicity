import { z } from "zod";

// Moved out of app/api/auth/register/route.ts on 2026-07-28 — a Next.js App
// Router route.ts file may only export HTTP method handlers (GET/POST/etc.)
// and a small set of route config fields (dynamic, revalidate, runtime, ...).
// Exporting an arbitrary const like `passwordSchema` from a route file broke
// the Vercel build with: 'Route "…/register/route.ts" does not match the
// required types of a Next.js Route. "passwordSchema" is not a valid Route
// export field.' This had apparently been working locally/in tsc --noEmit
// (which doesn't run Next's route-export validation) until a Next.js 14.2.x
// patch bump tightened the check — see TODO.md for the three deploys this
// broke. Both register/route.ts and reset-password/route.ts import this.
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[0-9]/, "Must contain at least one number");
