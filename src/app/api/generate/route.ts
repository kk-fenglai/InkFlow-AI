import { NextResponse } from "next/server";
import { CREDIT_COST } from "@/lib/constants";
import { deductCredits } from "@/lib/credits";
import { getSessionUser } from "@/lib/session";
import { buildStrokePayload, enhanceSignatureSettings, isValidBaseId } from "@/lib/server-ai";
import type { SignatureSettings } from "@/lib/signature";
import { backgroundFieldsFromPartial } from "@/lib/signature";
import { premiumAccessResponse } from "@/lib/template-access";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to render final ink.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  let body: Partial<SignatureSettings> & {
    canvasWidth?: number;
    canvasHeight?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = String(body.text ?? "").trim().slice(0, 40);
  if (!text) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const baseId = body.baseId ?? "poet";
  if (!isValidBaseId(baseId)) {
    return NextResponse.json({ error: "Invalid base" }, { status: 400 });
  }

  const settings: SignatureSettings = {
    text,
    baseId,
    fluidity: clamp(body.fluidity, 1, 100),
    rhythm: clamp(body.rhythm, 1, 100),
    pressure: clamp(body.pressure, 1, 100),
    slant: clamp(body.slant, -20, 20),
    size: clamp(body.size ?? 1, 0.5, 1.5),
    inkColor: String(body.inkColor ?? "#1d1c16").slice(0, 20),
    ...backgroundFieldsFromPartial(body),
  };

  const locked = await premiumAccessResponse(user.id, settings.baseId);
  if (locked) return locked;

  const deducted = await deductCredits(
    user.id,
    CREDIT_COST.GENERATE_FINAL,
    "generate_final_ink",
  );

  if (!deducted.ok) {
    return NextResponse.json(
      {
        error: "Not enough credits. Buy a pack on your account page.",
        code: "INSUFFICIENT_CREDITS",
        credits: deducted.remaining,
      },
      { status: 402 },
    );
  }

  const enhanced = enhanceSignatureSettings(settings);
  const canvasWidth = clamp(body.canvasWidth ?? 600, 200, 1200);
  const canvasHeight = clamp(body.canvasHeight ?? 240, 100, 600);
  const strokeData = buildStrokePayload(enhanced, canvasWidth, canvasHeight);

  return NextResponse.json({
    ok: true,
    creditsRemaining: deducted.remaining,
    settings: enhanced,
    strokeData,
    aiNote: enhanced.aiNote,
    watermark: false,
  });
}

function clamp(n: unknown, min: number, max: number): number {
  const v = Number(n);
  if (Number.isNaN(v)) return min;
  return Math.min(max, Math.max(min, v));
}
