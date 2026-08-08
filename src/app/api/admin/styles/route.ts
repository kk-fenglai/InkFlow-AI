import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { parseImageDataUrl } from "@/lib/admin/upload";

const STYLE_METADATA = {
  id: true,
  name: true,
  blurb: true,
  prompt: true,
  mimeType: true,
  byteSize: true,
  active: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json(
      { error: admin.error, code: admin.code },
      { status: admin.status },
    );
  }

  const styles = await prisma.aiStyleAsset.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: STYLE_METADATA,
  });
  return NextResponse.json({ ok: true, styles });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json(
      { error: admin.error, code: admin.code },
      { status: admin.status },
    );
  }

  let body: { name?: string; blurb?: string; prompt?: string; image?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = String(body.name ?? "").trim().slice(0, 60);
  const blurb = String(body.blurb ?? "").trim().slice(0, 120);
  const prompt = String(body.prompt ?? "").trim().slice(0, 2000);
  if (!name || !prompt) {
    return NextResponse.json(
      { error: "name and prompt are required." },
      { status: 400 },
    );
  }

  const parsed = parseImageDataUrl(body.image);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const max = await prisma.aiStyleAsset.aggregate({ _max: { sortOrder: true } });
  const style = await prisma.aiStyleAsset.create({
    data: {
      name,
      blurb,
      prompt,
      mimeType: parsed.upload.mimeType,
      image: parsed.upload.buffer,
      byteSize: parsed.upload.byteSize,
      sortOrder: (max._max.sortOrder ?? 0) + 1,
      createdBy: admin.user.id,
    },
    select: STYLE_METADATA,
  });
  return NextResponse.json({ ok: true, style });
}
