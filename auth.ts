import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { authConfig } from "./auth.config";
import { isAllowedAdminEmail } from "./lib/allowed-emails";
import { prisma } from "./lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  events: {
    async createUser({ user }) {
      if (!user.id || isAllowedAdminEmail(user.email)) return;
      await prisma.user.update({
        where: { id: user.id },
        data: { joinSource: "QR" },
      });
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (!user?.email) return token;

      const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, role: true },
      });

      if (!dbUser) return token;

      const role = isAllowedAdminEmail(user.email) ? "ADMIN" : "MEMBER";

      if (dbUser.role !== role) {
        await prisma.user.update({
          where: { id: dbUser.id },
          data: { role },
        });
      }

      token.id = dbUser.id;
      token.role = role;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.id === "string" ? token.id : "";
        session.user.role = token.role === "ADMIN" ? "ADMIN" : "MEMBER";
      }
      return session;
    },
  },
});
