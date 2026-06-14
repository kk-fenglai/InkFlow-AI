import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { isStripeConfigured } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { createBillingPortalSession } from "@/lib/payments/stripe-subscription";
import { appOrigin } from "@/lib/payments/urls";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe not configured." }, { status: 503 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { stripeCustomerId: true },
  });

  const contract = await prisma.payContract.findFirst({
    where: {
      userId: user.id,
      status: { in: ["active", "suspended"] },
      stripeCustomerId: { not: null },
    },
    orderBy: { createdAt: "desc" },
  });

  const customerId =
    dbUser?.stripeCustomerId ?? contract?.stripeCustomerId ?? null;

  if (!customerId) {
    return NextResponse.json(
      { error: "No active subscription billing profile.", code: "NO_CUSTOMER" },
      { status: 404 },
    );
  }

  const origin =
    process.env.NEXTAUTH_URL ?? req.headers.get("origin") ?? appOrigin();

  const url = await createBillingPortalSession({
    stripeCustomerId: customerId,
    returnUrl: `${origin}/account`,
  });

  return NextResponse.json({ url });
}
