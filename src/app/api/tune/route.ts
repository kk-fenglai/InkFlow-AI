import { NextResponse } from "next/server";
import { AI_TUNE_USES_PER_CREDIT } from "@/lib/constants";
import { chargeAiTuneUse } from "@/lib/ai-tune-meter";
import { getSessionUser } from "@/lib/session";
import { tuneSignature } from "@/lib/nl-tune";
import { isValidBaseId } from "@/lib/server-ai";
import type { SignatureSettings } from "@/lib/signature";
import { backgroundFieldsFromPartial } from "@/lib/signature";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to use AI tuning.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  let body: { instruction?: string; settings?: Partial<SignatureSettings> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const instruction = String(body.instruction ?? "").trim().slice(0, 200);
  if (!instruction) {
    return NextResponse.json(
      { error: "Describe how to adjust your signature." },
      { status: 400 },
    );
  }

  const baseId = body.settings?.baseId ?? "poet";
  if (!isValidBaseId(baseId)) {
    return NextResponse.json({ error: "Invalid base" }, { status: 400 });
  }

  const settings: SignatureSettings = {
    text: String(body.settings?.text ?? "").trim().slice(0, 40) || "Signature",
    baseId,
    fluidity: clamp(body.settings?.fluidity, 1, 100),
    rhythm: clamp(body.settings?.rhythm, 1, 100),
    pressure: clamp(body.settings?.pressure, 1, 100),
    slant: clamp(body.settings?.slant, -20, 20),
    size: clamp(body.settings?.size ?? 1, 0.5, 1.5),
    inkColor: String(body.settings?.inkColor ?? "#1d1c16").slice(0, 20),
    ...backgroundFieldsFromPartial(body.settings ?? {}),
  };

  const meter = await chargeAiTuneUse(user.id);
  if (!meter.ok) {
    return NextResponse.json(
      {
        error: `Not enough credits (AI tune charges 1 credit every ${AI_TUNE_USES_PER_CREDIT} uses).`,
        code: "INSUFFICIENT_CREDITS",
        credits: meter.creditsRemaining,
        usesUntilCharge: meter.usesUntilCharge,
      },
      { status: 402 },
    );
  }

  const result = await tuneSignature(instruction, settings);

  return NextResponse.json({
    ok: true,
    creditsRemaining: meter.creditsRemaining,
    usesUntilCharge: meter.usesUntilCharge,
    charged: meter.charged,
    settings: result.settings,
    aiNote: result.aiNote,
    source: result.source,
    applied: result.applied,
  });
}

function clamp(n: unknown, min: number, max: number): number {
  const v = Number(n);
  if (Number.isNaN(v)) return min;
  return Math.min(max, Math.max(min, v));
}
