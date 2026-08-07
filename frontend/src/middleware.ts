/**
 * Next.js edge middleware — protects /dashboard and /admin routes.
 * Reads the access_token from localStorage via a cookie set during login.
 *
 * We store a lightweight `auth_token` cookie (httpOnly=false so we can
 * set it from JS) purely for middleware route-guard purposes. The real
 * token lives in localStorage and is used by the Axios client.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/settings", "/profile", "/history"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("auth_token")?.value;
  const isAuthenticated = Boolean(token);

  // Redirect unauthenticated users away from protected pages
  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (!isAuthenticated) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Auth pages (login/register) are always accessible — client-side
  // code handles the "already logged in → redirect to dashboard" case.
  // We can't reliably validate token expiry at the edge with just a cookie.

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico, public assets
     * - API routes handled by FastAPI
     */
    "/((?!_next/static|_next/image|favicon.ico|icons|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
