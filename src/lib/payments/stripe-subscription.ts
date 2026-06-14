import type Stripe from "stripe";
import { SUBSCRIPTION_PLAN, subscriptionStripePriceId } from "@/lib/constants";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function createSubscriptionCheckout(input: {
  purchaseId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string | null;
  stripeCustomerId?: string | null;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe not configured");

  const priceId = subscriptionStripePriceId();
  if (!priceId) {
    throw Object.assign(new Error("STRIPE_PRICE_PRO_MONTHLY not configured"), {
      code: "INVALID_PRICE",
    });
  }

  return stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    client_reference_id: input.purchaseId,
    customer: input.stripeCustomerId ?? undefined,
    customer_email: input.stripeCustomerId ? undefined : input.customerEmail ?? undefined,
    metadata: {
      purchaseId: input.purchaseId,
      userId: input.userId,
      planCode: SUBSCRIPTION_PLAN.id,
      purchaseType: "subscription",
    },
    subscription_data: {
      metadata: {
        purchaseId: input.purchaseId,
        userId: input.userId,
        planCode: SUBSCRIPTION_PLAN.id,
      },
    },
  });
}

export async function createBillingPortalSession(input: {
  stripeCustomerId: string;
  returnUrl: string;
}): Promise<string> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe not configured");

  const session = await stripe.billingPortal.sessions.create({
    customer: input.stripeCustomerId,
    return_url: input.returnUrl,
  });

  return session.url;
}

export async function ensureStripeCustomer(userId: string, email?: string | null) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true, email: true },
  });
  if (!user) return null;
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const stripe = getStripe();
  if (!stripe) return null;

  const customer = await stripe.customers.create({
    email: email ?? user.email ?? undefined,
    metadata: { userId },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}
