import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { authConfig } from "./auth.config";
import { isAllowedAdminEmail } from "./lib/allowed-emails";
import { prisma } from "./lib/prisma";

const adapter = PrismaAdapter(prisma);
if (adapter.updateUser) {
  const originalUpdateUser = adapter.updateUser;
  adapter.updateUser = async (data: any) => {
    // Prevent NextAuth from overwriting the user's custom profile picture on sign-in
    if (data.image) {
      delete data.image;
    }
    return originalUpdateUser(data);
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter,
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
      console.log("JWT Callback - user:", user?.email, "token.id:", token.id);
      if (!user?.email) return token;

      const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, role: true },
      });
      console.log("JWT Callback - dbUser found:", !!dbUser, "dbUser.id:", dbUser?.id);

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
      console.log("Session Callback - token.id:", token.id);
      if (session.user) {
        session.user.id = typeof token.id === "string" ? token.id : "";
        session.user.role = token.role === "ADMIN" ? "ADMIN" : "MEMBER";
      }
      return session;
    },
  },
});
