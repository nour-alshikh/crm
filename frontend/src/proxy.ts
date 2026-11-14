import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Laravel's session cookie is set on every request, authenticated or not —
// it can't tell "logged in" from "just visited the site". AuthController
// queues this separate marker cookie only on login/register and clears it
// on logout, so that's what actually reflects auth state here.
const AUTH_STATUS_COOKIE = process.env.NEXT_PUBLIC_AUTH_STATUS_COOKIE ?? "auth_status";

const PROTECTED_PATHS = ["/dashboard", "/admin"];
// Reset links are token-authenticated and independent of the current session,
// so /reset-password is intentionally not guest-only — a logged-in user should
// still be able to use a reset link mailed to them.
const GUEST_ONLY_PATHS = ["/login", "/register", "/forgot-password"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(AUTH_STATUS_COOKIE);

  const isProtected = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const isGuestOnly = GUEST_ONLY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (isProtected && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isGuestOnly && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/register", "/forgot-password"],
};
