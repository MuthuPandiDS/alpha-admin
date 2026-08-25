import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-safe Auth.js config used by `proxy.ts`.
 * Prisma and email allowlist checks live in `auth.ts` (Node).
 *
 * Any Google account may sign in: members self-register through `/join`, while
 * the admin dashboard stays restricted to `ADMIN_ALLOWED_EMAILS`.
 */
export const authConfig = {
  providers: [Google({ allowDangerousEmailAccountLinking: true })],
  pages: {
    signIn: "/login",
    error: "/login",
  },
} satisfies NextAuthConfig;
