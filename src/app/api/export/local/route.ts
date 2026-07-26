import { NextResponse } from "next/server";
import { CREDIT_COST } from "@/lib/constants";
import { guardCreditAction } from "@/lib/credit-guard";
import { isValidBaseId } from "@/lib/server-ai";

/**
 * Charge one credit for saving a rendered final-ink signature to the user's
 * device. Rendering the preview is free; this is the paid "Save to Local" step.
 * The client already holds the rendered canvas — it downloads it on success.
 */
export async function POST(req: Request) {
  let body: { baseId?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = String(body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (body.baseId && !isValidBaseId(body.baseId)) {
    return NextResponse.json({ error: "Invalid base" }, { status: 400 });
  }

  const guard = await guardCreditAction(
    CREDIT_COST.GENERATE_FINAL,
    "save_final_local",
    "save_local",
  );
  if (!guard.ok) return guard.response;

  return NextResponse.json({ ok: true, creditsRemaining: guard.remaining });
}
