import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Refine references are internal — image is admin-only. */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json(
      { error: admin.error, code: admin.code },
      { status: admin.status },
    );
  }

  const row = await prisma.refineReference.findUnique({
    where: { id: params.id },
    select: { image: true, mimeType: true },
  });
  if (!row) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(Buffer.from(row.image), {
    headers: {
      "Content-Type": row.mimeType,
      "Cache-Control": "private, max-age=300",
    },
  });
}
