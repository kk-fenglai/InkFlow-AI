import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getPack, isStripeConfigured } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { createCreditCheckoutSession } from "@/lib/payments/stripe-checkout";
import {
  checkoutCancelUrl,
  checkoutSuccessUrl,
} from "@/lib/payments/urls";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error: "Stripe is not configured. Add STRIPE_SECRET_KEY to .env.",
        code: "STRIPE_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  let body: { packId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const pack = getPack(body.packId ?? "");
  if (!pack) {
    return NextResponse.json({ error: "Unknown pack" }, { status: 400 });
  }

  const origin =
    process.env.NEXTAUTH_URL ?? req.headers.get("origin") ?? "http://localhost:3000";
  const amountCents = Math.round(pack.priceUsd * 100);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  const purchase = await prisma.creditPurchase.create({
    data: {
      userId: user.id,
      stripeSessionId: `pending_${crypto.randomUUID()}`,
      packId: pack.id,
      credits: pack.credits,
      amountCents,
      currency: "usd",
      status: "pending",
      expiresAt,
    },
  });

  let session;
  try {
    session = await createCreditCheckoutSession({
      purchaseId: purchase.id,
      userId: user.id,
      pack,
      successUrl: checkoutSuccessUrl(purchase.id, origin),
      cancelUrl: checkoutCancelUrl(purchase.id, origin),
      customerEmail: user.email,
    });
  } catch (err) {
    console.error("[stripe/checkout]", err);
    await prisma.creditPurchase.update({
      where: { id: purchase.id },
      data: { status: "failed" },
    });
    const detail =
      process.env.NODE_ENV === "development" && err instanceof Error
        ? err.message
        : undefined;
    return NextResponse.json(
      {
        error: "Stripe checkout unavailable, please retry.",
        code: "STRIPE_CHECKOUT_FAILED",
        ...(detail ? { detail } : {}),
      },
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
