import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-safe Auth.js config used by `proxy.ts`.
 * Prisma and email allowlist checks live in `auth.ts` (Node).
 */
export const authConfig = {
  providers: [Google],
  pages: {
    signIn: "/login",
    error: "/login",
  },
} satisfies NextAuthConfig;
