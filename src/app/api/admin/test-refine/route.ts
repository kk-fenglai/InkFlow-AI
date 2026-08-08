import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import {
  aiPhotoConfigured,
  generateSignatureImage,
  redesignSignatureImage,
} from "@/lib/ai-photo";
import { MAX_UPLOAD_DATA_URL } from "@/lib/admin/upload";

const DATA_URL_RE = /^data:image\/(png|jpeg|webp);base64,/;

/** Internal test runner for the AI pipeline. Never charges credits. */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json(
      { error: admin.error, code: admin.code },
      { status: admin.status },
    );
  }

  if (!aiPhotoConfigured()) {
    return NextResponse.json(
      { error: "AI photo generation is not configured." },
      { status: 503 },
    );
  }

  let body: { mode?: string; image?: string; name?: string; styleId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.mode === "redesign") {
    const image = String(body.image ?? "");
    if (!DATA_URL_RE.test(image)) {
      return NextResponse.json(
        { error: "image must be a png, jpeg, or webp data URL." },
        { status: 400 },
      );
    }
    if (image.length > MAX_UPLOAD_DATA_URL) {
      return NextResponse.json({ error: "Image is too large." }, { status: 413 });
    }
    const result = await redesignSignatureImage(image);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
    return NextResponse.json({ ok: true, image: result.image });
  }

  if (body.mode === "style") {
    const name = String(body.name ?? "").trim().slice(0, 40);
    if (!name) {
      return NextResponse.json({ error: "name is required." }, { status: 400 });
    }
    const styleId = String(body.styleId ?? "").slice(0, 40) || undefined;
    const result = await generateSignatureImage(name, styleId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
    return NextResponse.json({ ok: true, image: result.image });
  }

  return NextResponse.json(
    { error: 'mode must be "redesign" or "style".' },
    { status: 400 },
  );
}
