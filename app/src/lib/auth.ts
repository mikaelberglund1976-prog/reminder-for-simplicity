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
    // ─── Google OAuth ─────────────────────────────────────────────────────────
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // ─── E-post + lösenord (befintliga användare) ─────────────────────────────
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Lösenord", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email och lösenord krävs");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user || !user.password) {
          throw new Error("Felaktig email eller lösenord");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("Felaktig email eller lösenord");
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
    // ─── signIn: körs vid varje inloggning ───────────────────────────────────
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;

        // Hitta eller skapa användare
        let dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (!dbUser) {
          // Första Google-login: skapa konto + household
          dbUser = await prisma.user.create({
            data: {
              email: user.email,
              name: user.name ?? null,
              emailVerified: new Date(),
              // password är null för Google-användare
            },
          });

          // Skapa ett privat household för användaren (förbered för familjedelning)
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

        // Spara providerAccountId om det inte redan finns
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

        // Sätt user.id till vår DB-id (används i jwt-callback nedan)
        user.id = dbUser.id;
      }
      return true;
    },

    // ─── jwt: bygg JWT-token ──────────────────────────────────────────────────
    async jwt({ token, user, account }) {
      if (account?.provider === "google" && token.email) {
        // Hämta DB-id för Google-användare vid initial inloggning
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true },
        });
        if (dbUser) token.id = dbUser.id;
      } else if (user) {
        // Credentials-login
        token.id = user.id;
      }
      return token;
    },

    // ─── session: exponera id i session-objektet ─────────────────────────────
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};
