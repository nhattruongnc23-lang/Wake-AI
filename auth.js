import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./src/lib/prisma.js";

const allowedEmails = new Set(
  (process.env.WAKE_ALLOWED_EMAILS || "")
    .split(",")
    .map(value => value.trim().toLowerCase())
    .filter(Boolean)
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  session: { strategy: "database" },
  pages: { signIn: "/login" },
  trustHost: true,
  callbacks: {
    async signIn({ user, profile }) {
      const email = (user.email || profile?.email || "").toLowerCase();
      const verified = profile?.email_verified === true;
      return Boolean(email && verified && allowedEmails.has(email));
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role;
      }
      return session;
    }
  }
});
