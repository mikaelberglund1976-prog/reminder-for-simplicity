// In-memory rate limiter for login attempts (password + PIN).
//
// Built 2026-08-02 after a security review flagged that login had zero
// throttling — see OPERATIONS.md §8. PIN login is the sharpest risk: only
// 4 digits (10,000 combinations), and child-profile emails are sometimes
// guessable (e.g. "parent+childname@gmail.com"), so an attacker who can
// guess the email had unlimited PIN attempts before this.
//
// IMPORTANT CAVEAT: this is per-serverless-instance state, not a shared
// store. On Vercel, concurrent invocations can land on different instances,
// and any instance can cold-start and lose its counters. This still raises
// the cost of brute-forcing a *known* account dramatically (an attacker
// can't just fire thousands of requests through one warm instance), but it
// is not a complete, distributed-safe lockout. For that, replace this
// module with a shared store — Upstash Redis has a free tier and is the
// standard pairing with Vercel serverless functions. Tracked as a known
// limitation, not silently pretended away.

type Attempt = {
  count: number;
  firstAttempt: number;
  lockedUntil?: number;
};

const attempts = new Map<string, Attempt>();

const WINDOW_MS = 15 * 60 * 1000; // failures older than this don't count
const MAX_ATTEMPTS = 5; // failures allowed within the window before locking
const LOCKOUT_MS = 15 * 60 * 1000; // how long a lockout lasts

// Opportunistic cleanup so the Map doesn't grow forever on a long-lived
// instance. Cheap (O(n) over a small map) and only runs when we're already
// touching the map, so no background timers are needed in a serverless
// context.
function sweepExpired(now: number) {
  if (attempts.size < 500) return; // not worth sweeping a small map
  // .forEach() instead of for..of — avoids needing --downlevelIteration for
  // Map iteration under this project's current tsconfig target.
  const staleKeys: string[] = [];
  attempts.forEach((entry, key) => {
    const stillLocked = entry.lockedUntil && entry.lockedUntil > now;
    const withinWindow = now - entry.firstAttempt < WINDOW_MS;
    if (!stillLocked && !withinWindow) staleKeys.push(key);
  });
  staleKeys.forEach((key) => attempts.delete(key));
}

// Call before verifying a password/PIN. Throws a user-facing error if the
// key (e.g. `login:${email}`) is currently locked out.
export function checkRateLimit(key: string) {
  const now = Date.now();
  sweepExpired(now);

  const entry = attempts.get(key);
  if (entry?.lockedUntil && entry.lockedUntil > now) {
    const minutesLeft = Math.ceil((entry.lockedUntil - now) / 60000);
    throw new Error(
      `Too many attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`
    );
  }
}

// Call after a failed password/PIN check.
export function recordFailedAttempt(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttempt: now });
    return;
  }

  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
  }
}

// Call on a successful login so a legitimate user isn't left half-counted
// toward a future lockout.
export function clearRateLimit(key: string) {
  attempts.delete(key);
}
