import { NextResponse } from "next/server";
import { CREDIT_COST } from "@/lib/constants";
import { addCredits, deductCredits, getCredits } from "@/lib/credits";
import {
  createUserSignature,
  listUserSignatures,
} from "@/lib/saved-signatures-db";
import { getSessionUser } from "@/lib/session";
import { buildStrokePayload, isValidBaseId } from "@/lib/server-ai";
import {
  isPremiumBase,
  type ArtistBaseId,
  type SignatureSettings,
} from "@/lib/signature";
import { backgroundFieldsFromPartial } from "@/lib/signature";
import type { SignatureStrokeData } from "@/lib/stroke-data";
import { premiumAccessResponse } from "@/lib/template-access";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to view your signature library.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const signatures = await listUserSignatures(user.id);
  return NextResponse.json({ ok: true, signatures });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to save signatures.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  let body: {
    name?: string;
    strokeData?: SignatureStrokeData;
    settings?: Partial<SignatureSettings>;
    canvasWidth?: number;
    canvasHeight?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let strokeData = body.strokeData ?? null;

  if (!strokeData && body.settings) {
    const baseId = body.settings.baseId ?? "poet";
    if (!isValidBaseId(baseId)) {
      return NextResponse.json({ error: "Invalid base" }, { status: 400 });
    }
    const settings: SignatureSettings = {
      text: String(body.settings.text ?? "").trim().slice(0, 40) || "Signature",
      baseId,
      fluidity: clamp(body.settings.fluidity, 1, 100),
      rhythm: clamp(body.settings.rhythm, 1, 100),
      pressure: clamp(body.settings.pressure, 1, 100),
      slant: clamp(body.settings.slant, -20, 20),
      size: clamp(body.settings.size ?? 1, 0.5, 1.5),
      inkColor: String(body.settings.inkColor ?? "#1d1c16").slice(0, 20),
      ...backgroundFieldsFromPartial(body.settings),
    };
    strokeData = buildStrokePayload(
      settings,
      clamp(body.canvasWidth ?? 600, 200, 1200),
      clamp(body.canvasHeight ?? 240, 100, 600),
    );
  }

  if (!strokeData || strokeData.version !== 1) {
    return NextResponse.json(
      { error: "Valid stroke data or settings required." },
      { status: 400 },
    );
  }

  const name =
    String(body.name ?? strokeData.text ?? "My Signature").trim().slice(0, 60) ||
    "My Signature";

  const baseId = strokeData.settings.baseId as ArtistBaseId;
  const premium = isPremiumBase(baseId);

  if (premium) {
    const locked = await premiumAccessResponse(user.id, baseId);
    if (locked) return locked;
  }

  let creditsRemaining = user.credits;

  if (premium) {
    const deducted = await deductCredits(
      user.id,
      CREDIT_COST.SAVE_SIGNATURE,
      "save_signature_cloud_premium",
    );

    if (!deducted.ok) {
      return NextResponse.json(
        {
          error: "Premium templates cost 1 credit to save to cloud library.",
          code: "INSUFFICIENT_CREDITS",
          credits: deducted.remaining,
        },
        { status: 402 },
      );
    }
    creditsRemaining = deducted.remaining;
  }

  try {
    const signature = await createUserSignature(user.id, name, strokeData);
    return NextResponse.json({
      ok: true,
      signature,
      creditsRemaining,
      charged: premium,
    });
  } catch (e) {
    if (premium) {
      await addCredits(
        user.id,
        CREDIT_COST.SAVE_SIGNATURE,
        "save_signature_refund",
      );
    }
    const message = e instanceof Error ? e.message : "Save failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function clamp(n: unknown, min: number, max: number): number {
  const v = Number(n);
  if (Number.isNaN(v)) return min;
  return Math.min(max, Math.max(min, v));
}
