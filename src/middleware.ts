import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  isMobileApiPath,
  mobileOptionsResponse,
  withMobileCors,
} from "@/lib/mobile-auth/cors";

// User-facing app pages. Admins are a backend-only role and get bounced out of
// these into /admin; normal and anonymous users are unaffected.
const USER_APP_PREFIXES = ["/studio", "/library", "/refine", "/sign"];

function hasPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (isMobileApiPath(path)) {
    if (req.method === "OPTIONS") {
      return mobileOptionsResponse(req);
    }
    return withMobileCors(req, NextResponse.next());
  }

  const isAdminPath = path.startsWith("/admin");
  const isAccountPath = path.startsWith("/account");
  const isUserAppPath = USER_APP_PREFIXES.some((p) => hasPrefix(path, p));

  if (isAdminPath || isAccountPath || isUserAppPath) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // The admin login page is the one /admin route that must stay reachable
    // without an admin session. Already-signed-in admins skip the form.
    if (path === "/admin/login") {
      if (token?.role === "admin") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      return NextResponse.next();
    }

    // Admins are confined to the backend: keep them out of the studio and
    // account pages entirely.
    if (token?.role === "admin" && (isUserAppPath || isAccountPath)) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    // The admin area requires an admin session.
    if (isAdminPath && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    // The account area requires any session. User-app pages stay open to
    // normal and anonymous visitors, so they are not gated here.
    if (isAccountPath && !token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/account",
    "/account/:path*",
    "/admin",
    "/admin/:path*",
    "/studio",
    "/studio/:path*",
    "/library",
    "/library/:path*",
    "/refine",
    "/refine/:path*",
    "/sign",
    "/sign/:path*",
    "/api/mobile/:path*",
    "/api/apple/:path*",
    "/api/google/:path*",
  ],
};
