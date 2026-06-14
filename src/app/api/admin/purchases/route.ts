import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json(
      { error: admin.error, code: admin.code },
      { status: admin.status },
    );
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const purchases = await prisma.creditPurchase.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { email: true, name: true } },
      refunds: { orderBy: { createdAt: "desc" }, take: 3 },
    },
  });

  return NextResponse.json({ ok: true, purchases });
}
