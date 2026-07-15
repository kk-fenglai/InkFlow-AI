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

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, emailVerifiedAt: true, credits: true, plan: true },
  });
  if (!dbUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    email: dbUser.email,
    emailVerified: Boolean(dbUser.emailVerifiedAt),
    credits: dbUser.credits,
    plan: dbUser.plan,
  });
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in required.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  await prisma.user.delete({ where: { id: user.id } });

  return NextResponse.json({ ok: true });
}
