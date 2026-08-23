import { prisma } from "@/lib/prisma";

export interface AdminStats {
  users: number;
  purchasesCompleted: number;
  revenueCents: number;
  stylesActive: number;
  refsActive: number;
}

export async function getAdminStats(): Promise<AdminStats> {
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

  return {
    users,
    purchasesCompleted,
    revenueCents: revenue._sum.amountCents ?? 0,
    stylesActive,
    refsActive,
  };
}
