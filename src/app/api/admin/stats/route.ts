import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json(
      { error: admin.error, code: admin.code },
      { status: admin.status },
    );
  }

  const [users, purchasesCompleted, revenue, stylesActive, refsActive] =
    await Promise.all([
      prisma.user.count(),
      prisma.creditPurchase.count({ where: { status: "completed" } }),
      prisma.creditPurchase.aggregate({
        where: { status: "completed" },
        _sum: { amountCents: true },
      }),
      prisma.aiStyleAsset.count({ where: { active: true } }),
      prisma.refineReference.count({ where: { active: true } }),
    ]);

  return NextResponse.json({
    ok: true,
    stats: {
      users,
      purchasesCompleted,
      revenueCents: revenue._sum.amountCents ?? 0,
      stylesActive,
      refsActive,
    },
  });
}
