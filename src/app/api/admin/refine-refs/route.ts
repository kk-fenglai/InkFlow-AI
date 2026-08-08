import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { parseImageDataUrl } from "@/lib/admin/upload";

const REF_METADATA = {
  id: true,
  label: true,
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

  const refs = await prisma.refineReference.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: REF_METADATA,
  });
  return NextResponse.json({ ok: true, refs });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json(
      { error: admin.error, code: admin.code },
      { status: admin.status },
    );
  }

  let body: { label?: string; image?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const label = String(body.label ?? "").trim().slice(0, 60);
  if (!label) {
    return NextResponse.json({ error: "label is required." }, { status: 400 });
  }

  const parsed = parseImageDataUrl(body.image);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const max = await prisma.refineReference.aggregate({ _max: { sortOrder: true } });
  const ref = await prisma.refineReference.create({
    data: {
      label,
      mimeType: parsed.upload.mimeType,
      image: parsed.upload.buffer,
      byteSize: parsed.upload.byteSize,
      sortOrder: (max._max.sortOrder ?? 0) + 1,
      createdBy: admin.user.id,
    },
    select: REF_METADATA,
  });
  return NextResponse.json({ ok: true, ref });
}
