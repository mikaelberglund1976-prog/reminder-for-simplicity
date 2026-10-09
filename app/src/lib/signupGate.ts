// 2026-10-09: admin approval of self-registered accounts is OFF by default
// (persona review: a new family must be able to get in the same evening).
// Set REQUIRE_SIGNUP_APPROVAL=true in Vercel to turn the old testing-phase
// gate back on — everything in /admin keeps working either way.
export const REQUIRE_SIGNUP_APPROVAL = process.env.REQUIRE_SIGNUP_APPROVAL === "true";
