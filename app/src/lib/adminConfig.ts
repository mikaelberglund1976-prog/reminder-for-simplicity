// Client-side admin check — mirrors the ADMIN_EMAIL used to gate /admin and
// its API routes. Kept as one shared constant so the admin page and the
// hamburger menu (components/HamburgerMenu.tsx) can't drift apart.
//
// Fixed 2026-08-02 (security review, OPERATIONS.md §8): this used to
// hardcode the address instead of reading `process.env.ADMIN_EMAIL` like
// every API route already did (e.g. `admin/users/route.ts`). No leak risk
// existed — the server-side checks were always the real gate — but if the
// admin email is ever rotated via env, this file would silently keep
// pointing at the old address while the API routes moved on. Same fallback
// value as the API routes so behavior is unchanged when the env var isn't set.
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "mikaelberglund1976@gmail.com";
