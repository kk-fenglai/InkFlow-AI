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

    if (path.startsWith("/admin") && token?.role !== "admin") {
      const login = new URL("/login", req.url);
      return NextResponse.redirect(login);
    }

    if (!token) {
      const login = new URL("/login", req.url);
      return NextResponse.redirect(login);
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
