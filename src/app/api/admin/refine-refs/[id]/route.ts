import { NextResponse } from "next/server";
import { requireAdmin, verifyAdminPassword } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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

  let body: { label?: string; active?: boolean; sortOrder?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const data: Prisma.RefineReferenceUpdateInput = {};
  if (body.label !== undefined) {
    const label = String(body.label).trim().slice(0, 60);
    if (!label) {
      return NextResponse.json({ error: "label cannot be empty." }, { status: 400 });
    }
    data.label = label;
  }
  if (body.active !== undefined) data.active = Boolean(body.active);
  if (body.sortOrder !== undefined) data.sortOrder = Math.trunc(Number(body.sortOrder)) || 0;

  try {
    const ref = await prisma.refineReference.update({
      where: { id: params.id },
      data,
      select: REF_METADATA,
    });
    return NextResponse.json({ ok: true, ref });
  } catch {
    return NextResponse.json({ error: "Reference not found." }, { status: 404 });
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
    await prisma.refineReference.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Reference not found." }, { status: 404 });
  }
}
