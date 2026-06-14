import { NextResponse } from "next/server";
import type { ImageStats } from "@/lib/ink-refine";
import { analyzeRefineImage } from "@/lib/server-ai";

/** Refinement analysis helper — free, no credits. Export runs client-side. */
export async function POST(req: Request) {
  let body: { imageBase64?: string; imageStats?: ImageStats };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const imageBase64 = body.imageBase64?.replace(/^data:image\/\w+;base64,/, "");
  if (!imageBase64 || imageBase64.length < 100) {
    return NextResponse.json(
      { error: "Upload an image first." },
      { status: 400 },
    );
  }

  const analysis = analyzeRefineImage(body.imageStats ?? null);

  return NextResponse.json({
    ok: true,
    analysis,
    exportAuthorized: true,
  });
}
