import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

/** Most recent sign-ins for a user. Admin session required. */
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

  const logins = await prisma.loginEvent.findMany({
    where: { userId: params.id },
    orderBy: { createdAt: "desc" },
    take: 25,
    select: {
      id: true,
      source: true,
      ip: true,
      userAgent: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, logins });
}
