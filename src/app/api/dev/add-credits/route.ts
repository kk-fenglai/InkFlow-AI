import { NextResponse } from "next/server";
import { addCredits } from "@/lib/credits";
import { getSessionUser } from "@/lib/session";

/** Development-only: add credits without Stripe (for local testing). */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }

  let amount = 10;
  try {
    const body = await req.json();
    if (typeof body.amount === "number") amount = Math.min(100, body.amount);
  } catch {
    /* default */
  }

  const remaining = await addCredits(user.id, amount, "dev_grant");
  return NextResponse.json({ ok: true, credits: remaining });
}
