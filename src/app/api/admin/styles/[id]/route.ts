import { NextResponse } from "next/server";
import { requireAdmin, verifyAdminPassword } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { parseImageDataUrl } from "@/lib/admin/upload";
import { Prisma } from "@prisma/client";

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

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json(
      { error: admin.error, code: admin.code },
      { status: admin.status },
    );
  }

  let body: {
    name?: string;
    blurb?: string;
    prompt?: string;
    active?: boolean;
    sortOrder?: number;
    image?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const data: Prisma.AiStyleAssetUpdateInput = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim().slice(0, 60);
    if (!name) {
      return NextResponse.json({ error: "name cannot be empty." }, { status: 400 });
    }
    data.name = name;
  }
  if (body.blurb !== undefined) data.blurb = String(body.blurb).trim().slice(0, 120);
  if (body.prompt !== undefined) {
    const prompt = String(body.prompt).trim().slice(0, 2000);
    if (!prompt) {
      return NextResponse.json({ error: "prompt cannot be empty." }, { status: 400 });
    }
    data.prompt = prompt;
  }
  if (body.active !== undefined) data.active = Boolean(body.active);
  if (body.sortOrder !== undefined) data.sortOrder = Math.trunc(Number(body.sortOrder)) || 0;
  if (body.image !== undefined) {
    const parsed = parseImageDataUrl(body.image);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }
    data.mimeType = parsed.upload.mimeType;
    data.image = parsed.upload.buffer;
    data.byteSize = parsed.upload.byteSize;
  }

  try {
    const style = await prisma.aiStyleAsset.update({
      where: { id: params.id },
      data,
      select: STYLE_METADATA,
    });
    return NextResponse.json({ ok: true, style });
  } catch {
    return NextResponse.json({ error: "Style not found." }, { status: 404 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json(
      { error: admin.error, code: admin.code },
      { status: admin.status },
    );
  }

  const adminPassword = req.headers.get("x-admin-password") ?? "";
  if (!adminPassword) {
    return NextResponse.json(
      { error: "X-Admin-Password header required.", code: "PASSWORD_REQUIRED" },
      { status: 400 },
    );
  }
  const valid = await verifyAdminPassword(admin.user.id, adminPassword);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid admin password.", code: "INVALID_PASSWORD" },
      { status: 403 },
    );
  }

  try {
    await prisma.aiStyleAsset.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Style not found." }, { status: 404 });
  }
}
