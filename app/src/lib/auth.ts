import { initHouseholdLanguage } from "@/lib/i18n/server";
import { NextAuthOptions } from "next-auth";
import { Provider } from "next-auth/providers/index";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendAdminApprovalRequestEmail } from "@/lib/email";
import { REQUIRE_SIGNUP_APPROVAL } from "@/lib/signupGate";
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from "@/lib/rateLimit";
import { EMAIL_NOT_VERIFIED_MESSAGE, ACCOUNT_DELETED_MESSAGE } from "@/lib/verification";
import { autoJoinPendingInvite, findPendingInvite } from "@/lib/invites";
import { endImpersonation, IMPERSONATION_MAX_MS, startImpersonation } from "@/lib/impersonation";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "mikaelberglund1976@gmail.com";

// Thrown by the credentials provider below when an account exists but
// hasn't been approved yet. Kept as an exact string constant so login/page.tsx
// and family/page.tsx can match on it and show this specific message instead
// of their generic "wrong password" fallback.
export const PENDING_APPROVAL_MESSAGE = "Your account is pending admin approval.";

// Google OAuth is optional. Only register the provider when both env vars are
// actually set, so local/dev setups without Google credentials don't crash on
// the non-null assertion this used to have.
const providers: Provider[] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

providers.push(
  // ─── Email + password (existing users) ────────────────────────────────────
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error("Email and password are required");
      }

      // Rate limiting (2026-08-02, see lib/rateLimit.ts) — shared per-account
      // lockout across both the password and PIN providers, since both are
      // ultimately "log in as this account" attempts.
      const rateLimitKey = `login:${credentials.email.toLowerCase()}`;
      checkRateLimit(rateLimitKey);

      const user = await prisma.user.findUnique({
        where: { email: credentials.email.toLowerCase() },
      });

      if (!user || !user.password) {
        recordFailedAttempt(rateLimitKey);
        throw new Error("Incorrect email or password");
      }

      const isValid = await bcrypt.compare(credentials.password, user.password);

      if (!isValid) {
        recordFailedAttempt(rateLimitKey);
        throw new Error("Incorrect email or password");
      }

      clearRateLimit(rateLimitKey);

      // 2026-09-27: order matters — deleted first (don't tell a deleted
      // account to go verify), then email verification, then admin approval.
      if (user.deletedAt) {
        throw new Error(ACCOUNT_DELETED_MESSAGE);
      }
      if (!user.emailVerified) {
        throw new Error(EMAIL_NOT_VERIFIED_MESSAGE);
      }
      if (!user.approved && !REQUIRE_SIGNUP_APPROVAL) {
        // 2026-10-09: gate is off — anyone still waiting from the testing
        // phase is let in (and marked approved) at their next sign-in.
        await prisma.user.update({ where: { id: user.id }, data: { approved: true, approvedAt: new Date() } });
      } else if (!user.approved) {
        // 2026-09-29: someone a family has invited (e.g. a child who signed
        // up before the parent added them) doesn't wait for admin approval —
        // the jwt callback joins them to the family right after this.
        const invite = await findPendingInvite(user.email);
        if (!invite) throw new Error(PENDING_APPROVAL_MESSAGE);
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
      };
    },
  })
);

// 2026-09-27: the "pin" provider was removed — 4-digit PIN login was too
// weak to keep as the family grows (Mikael: "Barnprofiler ska inte ha bara
// pin, för osäkert när vi växer"). Every account now logs in with a
// verified email + password, or Google.

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    // 2026-10-04 (PWA): stay logged in when the app is opened from the home
    // screen. Rolling: refreshed at most once a day while in use, so only
    // ~90 days of inactivity logs someone out.
    maxAge: 60 * 60 * 24 * 90,
    updateAge: 60 * 60 * 24,
  },
  pages: {
    signIn: "/login",
    signOut: "/",
    error: "/login",
  },
  providers,
  callbacks: {
    // ─── signIn: runs on every login ──────────────────────────────────────────
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;

        // Find or create the user
        let dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        const isNewUser = !dbUser;

        // 2026-09-27: soft-deleted accounts can't sign in with Google either.
        if (dbUser?.deletedAt) {
          return "/login?error=AccountDeleted";
        }
        // Google has verified this address, so signing in with Google also
        // counts as email verification (e.g. a child whose parent-created
        // account is still waiting for the setup link).
        if (dbUser && !dbUser.emailVerified) {
          dbUser = await prisma.user.update({ where: { id: dbUser.id }, data: { emailVerified: new Date() } });
        }

        if (!dbUser) {
          // First Google login: create account + household. New accounts are
          // pending admin approval by default (testing phase — see
          // PENDING_APPROVAL_MESSAGE above and /admin), except the admin's
          // own email, which bootstraps itself in approved.
          const isAdmin = user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
          dbUser = await prisma.user.create({
            data: {
              email: user.email,
              name: user.name ?? null,
              emailVerified: new Date(),
              approved: isAdmin || !REQUIRE_SIGNUP_APPROVAL,
              approvedAt: isAdmin || !REQUIRE_SIGNUP_APPROVAL ? new Date() : null,
              // password is null for Google users
            },
          });

          // Create a private household for the user (ready for family sharing)
          const household = await prisma.household.create({
            data: { name: dbUser.name ?? "My household" },
          });
          await initHouseholdLanguage(household.id);
          await prisma.householdMember.create({
            data: {
              householdId: household.id,
              userId: dbUser.id,
              role: "OWNER",
            },
          });
        }

        // 2026-09-29: invited by a family (a parent added this Google address
        // as their child, or invited an adult) → join now, no admin approval
        // needed. Covers both a brand-new Google account and one that was
        // waiting for approval.
        if (await autoJoinPendingInvite(dbUser.id, dbUser.email)) {
          dbUser = await prisma.user.findUniqueOrThrow({ where: { id: dbUser.id } });
        }

        // Block sign-in for accounts that haven't been approved yet. This
        // covers both the brand-new account just created above and any
        // existing-but-still-pending account trying to sign in again.
        if (!dbUser.approved && !REQUIRE_SIGNUP_APPROVAL) {
          dbUser = await prisma.user.update({ where: { id: dbUser.id }, data: { approved: true, approvedAt: new Date() } });
        }
        if (!dbUser.approved) {
          if (isNewUser) {
            sendAdminApprovalRequestEmail({
              adminEmail: ADMIN_EMAIL,
              userEmail: dbUser.email,
              userName: dbUser.name,
              via: "google",
            }).catch(console.error);
          }
          // Returning a string redirects the browser there instead of
          // creating a session — login/page.tsx reads ?error=PendingApproval
          // and shows PENDING_APPROVAL_MESSAGE.
          return "/login?error=PendingApproval";
        }

        // Save the providerAccountId if it doesn't already exist
        const existingAccount = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: "google",
              providerAccountId: account.providerAccountId,
            },
          },
        });

        if (!existingAccount) {
          await prisma.account.create({
            data: {
              userId: dbUser.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              // 2026-09-29 (GDPR, data minimisation): Google's access/id
              // tokens are never used after sign-in, so they aren't stored.
              // lib/cron.ts clears any stored earlier.
            },
          });
        }

        // Set user.id to our DB id (used in the jwt callback below)
        user.id = dbUser.id;

        // Auto-join: check whether there's a pending invite for this email
        await autoJoinPendingInvite(dbUser.id, user.email!);
      }
      return true;
    },

    // ─── jwt: build the JWT token ─────────────────────────────────────────────
    async jwt({ token, user, account, trigger, session }) {
      // 2026-10-03: admin "view as" (impersonation) for testing — see
      // lib/impersonation.ts. Only the real admin can start it, only for
      // people in the admin's own family, and it ends by itself after 2 h.
      if (trigger === "update" && session && typeof session === "object") {
        const req = session as { impersonate?: unknown; stopImpersonating?: unknown };
        if (req.stopImpersonating) return endImpersonation(token);
        if (typeof req.impersonate === "string") return startImpersonation(token, req.impersonate);
      }
      if (token.realId && (!token.impAt || Date.now() - (token.impAt as number) > IMPERSONATION_MAX_MS)) {
        endImpersonation(token);
      }

      // 2026-09-27: a JWT session outlives the account being soft-deleted, so
      // re-check every 5 minutes and drop the user id if the account is gone
      // (every API route treats a missing session.user.id as logged out).
      const now = Date.now();
      if (token.id && !user && (!token.checkedAt || now - (token.checkedAt as number) > 5 * 60 * 1000)) {
        const u = await prisma.user.findUnique({ where: { id: token.id as string }, select: { deletedAt: true } });
        token.checkedAt = now;
        if (!u || u.deletedAt) {
          delete token.id;
          return token;
        }
      }

      if (account?.provider === "google" && token.email) {
        // Fetch DB id for Google users on initial login
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true },
        });
        if (dbUser) token.id = dbUser.id;
      } else if (user) {
        // Credentials login: run auto-join here since the signIn callback doesn't run
        token.id = user.id;
        if (user.email) await autoJoinPendingInvite(user.id, user.email);
      }
      return token;
    },

    // ─── session: expose id on the session object ─────────────────────────────
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        if (token.realId) {
          // While viewing as someone, the whole app sees that person.
          session.user.email = (token.email as string) ?? session.user.email;
          session.user.name = (token.name as string | null) ?? null;
          session.user.image = null;
          session.impersonator = { name: (token.realName as string | null) ?? null, email: token.realEmail as string, until: (token.impAt as number) + IMPERSONATION_MAX_MS };
        }
      }
      return session;
    },
  },
};
