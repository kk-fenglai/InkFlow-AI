import { NextResponse } from "next/server";
import { CREDIT_COST } from "@/lib/constants";
import { addCredits, deductCredits } from "@/lib/credits";
import { getSessionUser } from "@/lib/session";
import {
  assertValidPremiumBaseId,
  hasTemplateUnlock,
  unlockTemplateForUser,
} from "@/lib/template-unlocks-db";
import { getBase } from "@/lib/signature";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to unlock premium templates.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  let body: { baseId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let baseId;
  try {
    baseId = assertValidPremiumBaseId(String(body.baseId ?? ""));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid template." },
      { status: 400 },
    );
  }

  const alreadyOwned = await hasTemplateUnlock(user.id, baseId);
  if (alreadyOwned) {
    return NextResponse.json({
      ok: true,
      baseId,
      alreadyOwned: true,
      name: getBase(baseId).name,
    });
  }

  const deducted = await deductCredits(
    user.id,
    CREDIT_COST.TEMPLATE_UNLOCK,
    `unlock_template_${baseId}`,
  );

  if (!deducted.ok) {
    return NextResponse.json(
      {
        error: "Not enough credits to unlock this template.",
        code: "INSUFFICIENT_CREDITS",
        credits: deducted.remaining,
      },
      { status: 402 },
    );
  }

  try {
    await unlockTemplateForUser(user.id, baseId);
    return NextResponse.json({
      ok: true,
      baseId,
      name: getBase(baseId).name,
      creditsRemaining: deducted.remaining,
    });
  } catch (e) {
    await addCredits(
      user.id,
      CREDIT_COST.TEMPLATE_UNLOCK,
      `unlock_template_refund_${baseId}`,
    );
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unlock failed." },
      { status: 400 },
    );
  }
}
