import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  isMobileApiPath,
  mobileOptionsResponse,
  withMobileCors,
} from "@/lib/mobile-auth/cors";

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (isMobileApiPath(path)) {
    if (req.method === "OPTIONS") {
      return mobileOptionsResponse(req);
    }
    return withMobileCors(req, NextResponse.next());
  }

  if (
    path.startsWith("/account") ||
    path.startsWith("/admin")
  ) {
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

    if (path.startsWith("/admin") && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    if (!token) {
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
    "/api/mobile/:path*",
    "/api/apple/:path*",
    "/api/google/:path*",
  ],
};
