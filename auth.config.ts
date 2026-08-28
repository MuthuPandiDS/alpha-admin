import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

const isDev = process.env.NODE_ENV === "development";

/**
 * Edge-safe Auth.js config used by `proxy.ts`.
 * Prisma and email allowlist checks live in `auth.ts` (Node).
 *
 * Any Google account may sign in: members self-register through `/join`, while
 * the admin dashboard stays restricted to `ADMIN_ALLOWED_EMAILS`.
 *
 * In development the `_DEV` OAuth credentials are used so the dev and
 * production Google Cloud projects stay separate.
 */
export const authConfig = {
  trustHost: true,
  providers: [
    Google({
      clientId: isDev
        ? process.env.AUTH_GOOGLE_ID_DEV
        : process.env.AUTH_GOOGLE_ID,
      clientSecret: isDev
        ? process.env.AUTH_GOOGLE_SECRET_DEV
        : process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
} satisfies NextAuthConfig;

