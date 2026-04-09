import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    signOut: "/",
    error: "/login",
  },
  providers: [
    // ─── Google OAuth ────────────────────────────────────────────────────────────────────────────────
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // ─── Email + password (existing users) ──────────────────────────────────────────────────
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
    }),
  ],
  callbacks: {
    // ─── signIn: runs on every login ───────────────────────────────────────────────────────────────────
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;

        // Find or create user
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

        // Save providerAccountId if not already saved
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

        // Set user.id to our DB id (used in jwt callback below)
        user.id = dbUser.id;
      }
      return true;
    },

    // ─── jwt: build JWT token ──────────────────────────────────────────────────────────────────────
    async jwt({ token, user, account }) {
      if (account?.provider === "google" && token.email) {
        // Get DB id for Google users on initial login
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true },
        });
        if (dbUser) token.id = dbUser.id;
      } else if (user) {
        // Credentials login
        token.id = user.id;
      }
      return token;
    },

    // ─── session: expose id in session object ──────────────────────────────────────────────────────
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};
