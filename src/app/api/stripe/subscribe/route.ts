import { NextResponse } from "next/server";
import { SUBSCRIPTION_PLAN, subscriptionStripePriceId, CREDIT_PACK_CURRENCY } from "@/lib/constants";
import { getSessionUser } from "@/lib/session";
import { isStripeConfigured } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import {
  checkoutCancelUrl,
  checkoutSuccessUrl,
} from "@/lib/payments/urls";
import {
  createSubscriptionCheckout,
  ensureStripeCustomer,
} from "@/lib/payments/stripe-subscription";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe not configured.", code: "STRIPE_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  if (!subscriptionStripePriceId()) {
    return NextResponse.json(
      {
        error: "Set STRIPE_PRICE_PRO_MONTHLY in .env for subscriptions.",
        code: "INVALID_PRICE",
      },
      { status: 400 },
    );
  }

  const origin =
    process.env.NEXTAUTH_URL ?? req.headers.get("origin") ?? "http://localhost:3000";
  const amountCents = Math.round(SUBSCRIPTION_PLAN.priceEur * 100);

  const purchase = await prisma.creditPurchase.create({
    data: {
      userId: user.id,
      stripeSessionId: `pending_${crypto.randomUUID()}`,
      packId: SUBSCRIPTION_PLAN.id,
      purchaseType: "subscription",
      credits: SUBSCRIPTION_PLAN.creditsPerMonth,
      amountCents,
      currency: CREDIT_PACK_CURRENCY,
      status: "pending",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });

  const stripeCustomerId = await ensureStripeCustomer(user.id, user.email);

  let session;
  try {
    session = await createSubscriptionCheckout({
      purchaseId: purchase.id,
      userId: user.id,
      successUrl: checkoutSuccessUrl(purchase.id, origin),
      cancelUrl: checkoutCancelUrl(purchase.id, origin),
      customerEmail: user.email,
      stripeCustomerId,
    });
  } catch {
    await prisma.creditPurchase.update({
      where: { id: purchase.id },
      data: { status: "failed" },
    });
    return NextResponse.json(
      { error: "Could not start subscription checkout." },
      { status: 502 },
    );
  }

  await prisma.creditPurchase.update({
    where: { id: purchase.id },
    data: { stripeSessionId: session.id },
  });

  return NextResponse.json({
    url: session.url,
    purchaseId: purchase.id,
  });
}
