import { NextResponse } from "next/server";
import { CREDIT_COST } from "@/lib/constants";
import { addCredits, deductCredits } from "@/lib/credits";
import {
  aiPhotoConfigured,
  generateSignatureImage,
  redesignSignatureImage,
} from "@/lib/ai-photo";
import { getSessionUser } from "@/lib/session";

/** Max uploaded-photo payload for redesign (~2.5 MB binary as data URL). */
const MAX_REDESIGN_DATA_URL = 3_500_000;

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to use the AI Autograph.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  let body: {
    mode?: "style" | "redesign";
    name?: string;
    styleId?: string;
    image?: string;
    custom?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const mode = body.mode ?? "style";

  if (!aiPhotoConfigured()) {
    return NextResponse.json(
      {
        error: "AI photo generation is not available right now.",
        code: "NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  let reason: string;
  let run: () => Promise<{ ok: boolean; image?: string; error?: string }>;

  if (mode === "redesign") {
    const image = body.image ?? "";
    if (!/^data:image\/(png|jpeg|webp);base64,/.test(image)) {
      return NextResponse.json(
        { error: "A photo of your signature is required." },
        { status: 400 },
      );
    }
    if (image.length > MAX_REDESIGN_DATA_URL) {
      return NextResponse.json(
        { error: "Photo is too large. Try a smaller image." },
        { status: 413 },
      );
    }
    reason = "ai_photo_redesign";
    run = () => redesignSignatureImage(image);
  } else {
    const name = String(body.name ?? "").trim().slice(0, 40);
    if (name.length < 2) {
      return NextResponse.json(
        { error: "Enter a name of at least 2 characters." },
        { status: 400 },
      );
    }
    const styleId = String(body.styleId ?? "").slice(0, 40);
    const custom = String(body.custom ?? "").trim().slice(0, 200);
    reason = "ai_photo_generate";
    run = () => generateSignatureImage(name, styleId, custom || undefined);
  }

  const deducted = await deductCredits(user.id, CREDIT_COST.AI_PHOTO, reason);
  if (!deducted.ok) {
    return NextResponse.json(
      {
        error: "AI Autograph costs 1 credit per generation.",
        code: "INSUFFICIENT_CREDITS",
        credits: deducted.remaining,
      },
      { status: 402 },
    );
  }

  const result = await run();
  if (!result.ok || !result.image) {
    await addCredits(user.id, CREDIT_COST.AI_PHOTO, "ai_photo_refund");
    return NextResponse.json(
      { error: result.error ?? "Generation failed. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    image: result.image,
    creditsRemaining: deducted.remaining,
  });
}
