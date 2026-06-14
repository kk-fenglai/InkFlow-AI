import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in required.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const purchase = await prisma.creditPurchase.findFirst({
    where: { id: params.id, userId: user.id },
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

  if (!purchase) {
    return NextResponse.json({ error: "Purchase not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, purchase });
}
