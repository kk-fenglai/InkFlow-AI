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
import {
  buildCapturedStrokeData,
  type SignatureStrokeData,
} from "@/lib/stroke-data";
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
    kind?: "vector" | "captured";
    capturedImage?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Captured (photographed) handwritten signatures follow a separate path:
  // the extracted transparent PNG is stored in place of vector strokes.
  if (body.kind === "captured" || body.capturedImage) {
    return saveCapturedSignature(user.id, body);
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

  // Premium templates must be unlocked before they can be saved.
  if (premium) {
    const locked = await premiumAccessResponse(user.id, baseId);
    if (locked) return locked;
  }

  // Every cloud-library save costs 1 credit, regardless of template tier.
  const deducted = await deductCredits(
    user.id,
    CREDIT_COST.SAVE_SIGNATURE,
    "save_signature_cloud",
  );

  if (!deducted.ok) {
    return NextResponse.json(
      {
        error: "Saving to the cloud library costs 1 credit.",
        code: "INSUFFICIENT_CREDITS",
        credits: deducted.remaining,
      },
      { status: 402 },
    );
  }
  const creditsRemaining = deducted.remaining;

  try {
    const signature = await createUserSignature(user.id, name, strokeData);
    return NextResponse.json({
      ok: true,
      signature,
      creditsRemaining,
      charged: true,
    });
  } catch (e) {
    await addCredits(user.id, CREDIT_COST.SAVE_SIGNATURE, "save_signature_refund");
    const message = e instanceof Error ? e.message : "Save failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** Max captured-image payload (~2.5 MB binary) to keep DB rows bounded. */
const MAX_CAPTURED_DATA_URL = 3_500_000;

async function saveCapturedSignature(
  userId: string,
  body: {
    name?: string;
    capturedImage?: string;
    canvasWidth?: number;
    canvasHeight?: number;
  },
) {
  const image = body.capturedImage ?? "";
  if (!/^data:image\/(png|webp);base64,/.test(image)) {
    return NextResponse.json(
      { error: "Captured signature must be a transparent PNG." },
      { status: 400 },
    );
  }
  if (image.length > MAX_CAPTURED_DATA_URL) {
    return NextResponse.json(
      { error: "Captured image is too large. Try a smaller photo." },
      { status: 413 },
    );
  }

  const name =
    String(body.name ?? "Handwritten signature").trim().slice(0, 60) ||
    "Handwritten signature";
  const width = clamp(body.canvasWidth ?? 600, 100, 2000);
  const height = clamp(body.canvasHeight ?? 240, 60, 2000);

  const strokeData = buildCapturedStrokeData(image, name, width, height);

  const deducted = await deductCredits(
    userId,
    CREDIT_COST.SAVE_SIGNATURE,
    "save_signature_captured",
  );
  if (!deducted.ok) {
    return NextResponse.json(
      {
        error: "Saving a captured signature costs 1 credit.",
        code: "INSUFFICIENT_CREDITS",
        credits: deducted.remaining,
      },
      { status: 402 },
    );
  }

  try {
    const signature = await createUserSignature(userId, name, strokeData);
    return NextResponse.json({
      ok: true,
      signature,
      creditsRemaining: deducted.remaining,
      charged: true,
    });
  } catch (e) {
    await addCredits(userId, CREDIT_COST.SAVE_SIGNATURE, "save_signature_refund");
    const message = e instanceof Error ? e.message : "Save failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function clamp(n: unknown, min: number, max: number): number {
  const v = Number(n);
  if (Number.isNaN(v)) return min;
  return Math.min(max, Math.max(min, v));
}
