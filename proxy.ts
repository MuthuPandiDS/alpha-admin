import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = Boolean(req.auth);
  const isLogin = pathname.startsWith("/login");
  // Member self-registration is reachable by anyone with the gym QR code.
  const isPublic = isLogin || pathname.startsWith("/join");

  if (!isLoggedIn && !isPublic) {
    const login = new URL("/login", req.nextUrl);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  if (isLoggedIn && isLogin) {
    return NextResponse.redirect(new URL("/users", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
