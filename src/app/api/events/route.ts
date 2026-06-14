import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (process.env.NODE_ENV === "development") {
      console.info("[InkFlow event]", body);
    }
  } catch {
    /* ignore malformed payloads */
  }
  return new NextResponse(null, { status: 204 });
}
