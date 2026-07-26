import { NextResponse } from "next/server";

const MOBILE_API_PREFIXES = ["/api/mobile", "/api/apple", "/api/google"];

export function isMobileApiPath(pathname: string): boolean {
  return MOBILE_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function allowedOrigin(requestOrigin: string | null): string {
  const configured = process.env.MOBILE_CORS_ORIGINS?.trim();
  if (!configured || configured === "*") {
    return requestOrigin ?? "*";
  }
  const list = configured.split(",").map((o) => o.trim());
  if (requestOrigin && list.includes(requestOrigin)) {
    return requestOrigin;
  }
  return list[0] ?? "*";
}

export function withMobileCors(
  req: Request,
  res: NextResponse,
): NextResponse {
  const origin = req.headers.get("origin");
  res.headers.set("Access-Control-Allow-Origin", allowedOrigin(origin));
  res.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  res.headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type",
  );
  res.headers.set("Access-Control-Max-Age", "86400");
  return res;
}

export function mobileOptionsResponse(req: Request): NextResponse {
  return withMobileCors(req, new NextResponse(null, { status: 204 }));
}

export function jsonWithMobileCors(
  req: Request,
  body: unknown,
  init?: ResponseInit,
): NextResponse {
  return withMobileCors(req, NextResponse.json(body, init));
}
