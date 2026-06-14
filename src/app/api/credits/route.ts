import { NextResponse } from "next/server";
import { getCredits } from "@/lib/credits";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ authenticated: false, credits: 0 });
  }

  const credits = await getCredits(user.id);
  const recent = await prisma.creditTransaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return NextResponse.json({
    authenticated: true,
    credits,
    plan: user.plan,
    email: user.email,
    transactions: recent.map((t) => ({
      amount: t.amount,
      reason: t.reason,
      at: t.createdAt.toISOString(),
    })),
  });
}
