import type { NextAuthOptions } from "next-auth";

import CredentialsProvider from "next-auth/providers/credentials";

import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

import { rateLimit } from "@/lib/rate-limit";

import { recordLoginEvent, clientIpFromForwardedFor } from "@/lib/login-events";



export const authOptions: NextAuthOptions = {

  session: { strategy: "jwt" },

  pages: {

    signIn: "/login",

  },

  providers: [

    CredentialsProvider({

      name: "Studio Account",

      credentials: {

        email: { label: "Email", type: "email" },

        password: { label: "Password", type: "password" },

      },

      async authorize(credentials, req) {

        const email = credentials?.email?.trim().toLowerCase();

        const password = credentials?.password;

        if (!email || !password) return null;



        // Web sign-in had no throttle at all, unlike /api/mobile/login.

        const rl = rateLimit(`auth:credentials:${email}`, 10, 60_000);

        if (!rl.ok) return null;



        let user;

        try {

          user = await prisma.user.findUnique({ where: { email } });

        } catch {

          // DB unreachable — surface as a network error, not bad credentials.

          throw new Error("NETWORK_ERROR");

        }

        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);

        if (!valid) return null;

        const headers = req?.headers ?? {};

        await recordLoginEvent(user.id, {
          source: "web",
          ip: clientIpFromForwardedFor(headers["x-forwarded-for"]),
          userAgent: headers["user-agent"] ?? null,
        });



        return {

          id: user.id,

          email: user.email,

          name: user.name,

          credits: user.credits,

          plan: user.plan,

          role: user.role,

        };

      },

    }),

  ],

  callbacks: {

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.credits = (user as { credits?: number }).credits ?? 0;
        token.plan = (user as { plan?: string }).plan ?? "free";
        token.role = (user as { role?: string }).role ?? "user";
      }

      // Always sync credits/plan from DB so admin grants and purchases show up
      // without forcing the user to sign out.
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { credits: true, plan: true, name: true, role: true },
        });
        if (dbUser) {
          token.credits = dbUser.credits;
          token.plan = dbUser.plan;
          token.name = dbUser.name;
          token.role = dbUser.role;
        }
      }

      return token;
    },

    async session({ session, token }) {

      if (session.user) {

        session.user.id = token.id as string;

        session.user.credits = (token.credits as number) ?? 0;

        session.user.plan = (token.plan as string) ?? "free";

        session.user.role = (token.role as string) ?? "user";

      }

      return session;

    },

  },

};

