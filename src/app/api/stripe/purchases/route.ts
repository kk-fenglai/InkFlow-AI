import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in required.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const purchases = await prisma.creditPurchase.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      packId: true,
      credits: true,
      amountCents: true,
      currency: true,
      status: true,
      paidAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, purchases });
}
