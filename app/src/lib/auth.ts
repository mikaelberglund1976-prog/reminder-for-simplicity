import { NextAuthOptions } from "next-auth";
import { Provider } from "next-auth/providers/index";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

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

      const user = await prisma.user.findUnique({
        where: { email: credentials.email.toLowerCase() },
      });

      if (!user || !user.password) {
        throw new Error("Incorrect email or password");
      }

      const isValid = await bcrypt.compare(credentials.password, user.password);

      if (!isValid) {
        throw new Error("Incorrect email or password");
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
      };
    },
  })
);

providers.push(
  // ─── PIN (quick login on a shared family device) ──────────────────────────
  // Used by the /family switcher's numpad screen for both child profiles and
  // adults who've opted in. Child accounts store their PIN hash in
  // `password` (their only credential, set at creation — see
  // child-profiles route); adults who opt in get a separate `pin` field so
  // it never overwrites or weakens their real password. Kept as a distinct
  // provider (rather than overloading the "credentials" one) so the two
  // login surfaces can't be confused with each other.
  CredentialsProvider({
    id: "pin",
    name: "PIN",
    credentials: {
      email: { label: "Email", type: "email" },
      pin: { label: "PIN", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.pin) {
        throw new Error("PIN is required");
      }

      const user = await prisma.user.findUnique({
        where: { email: credentials.email.toLowerCase() },
      });
      if (!user) throw new Error("Account not found");

      const hash = user.isChildProfile ? user.password : user.pin;
      if (!hash) throw new Error("PIN login isn't set up for this account");

      const isValid = await bcrypt.compare(credentials.pin, hash);
      if (!isValid) throw new Error("Wrong PIN");

      return {
        id: user.id,
        email: user.email,
        name: user.name,
      };
    },
  })
);

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
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

        if (!dbUser) {
          // First Google login: create account + household
          dbUser = await prisma.user.create({
            data: {
              email: user.email,
              name: user.name ?? null,
              emailVerified: new Date(),
              // password is null for Google users
            },
          });

          // Create a private household for the user (ready for family sharing)
          const household = await prisma.household.create({
            data: { name: dbUser.name ?? "My household" },
          });
          await prisma.householdMember.create({
            data: {
              householdId: household.id,
              userId: dbUser.id,
              role: "OWNER",
            },
          });
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
              access_token: account.access_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
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
    async jwt({ token, user, account }) {
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
      }
      return session;
    },
  },
};

// ─── Helper: auto-join a household via a pending invite ─────────────────────
async function autoJoinPendingInvite(userId: string, email: string) {
  try {
    const invite = await prisma.householdInvite.findFirst({
      where: {
        email,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!invite) return;

    // Remove from any existing household
    await prisma.householdMember.deleteMany({ where: { userId } });

    // Join the invited household
    await prisma.householdMember.create({
      data: {
        householdId: invite.householdId,
        userId,
        role: invite.role ?? "MEMBER",
      },
    });

    // Mark the invite as used
    await prisma.householdInvite.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    });
  } catch (err) {
    // Log but don't crash the login
    console.error("Auto-join invite error:", err);
  }
}
