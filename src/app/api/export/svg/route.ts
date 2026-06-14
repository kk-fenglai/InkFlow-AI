import { NextResponse } from "next/server";
import { CREDIT_COST } from "@/lib/constants";
import { guardCreditAction } from "@/lib/credit-guard";
import { buildStrokePayload, enhanceSignatureSettings, isValidBaseId } from "@/lib/server-ai";
import type { SignatureSettings } from "@/lib/signature";
import { signatureToSvg, backgroundFieldsFromPartial } from "@/lib/signature";
import { premiumAccessResponse } from "@/lib/template-access";

export async function POST(req: Request) {
  const guard = await guardCreditAction(
    CREDIT_COST.SVG_EXPORT,
    "svg_export",
    "svg_export",
  );
  if (!guard.ok) return guard.response;

  let body: Partial<SignatureSettings> & { width?: number; height?: number };
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

  const locked = await premiumAccessResponse(guard.user.id, settings.baseId);
  if (locked) return locked;

  const enhanced = enhanceSignatureSettings(settings);
  const width = clamp(body.width ?? 800, 200, 1600);
  const height = clamp(body.height ?? 320, 100, 800);
  const svg = signatureToSvg(enhanced, width, height);

  return NextResponse.json({
    ok: true,
    svg,
    settings: enhanced,
    strokeData: buildStrokePayload(enhanced, width, height),
    creditsRemaining: guard.remaining,
  });
}

function clamp(n: unknown, min: number, max: number): number {
  const v = Number(n);
  if (Number.isNaN(v)) return min;
  return Math.min(max, Math.max(min, v));
}
