import type Stripe from "stripe";
import { addCredits } from "@/lib/credits";
import { prisma } from "@/lib/prisma";

export type SettleResult =
  | { claimed: true; purchaseId: string }
  | { claimed: false; reason: string };

/** Idempotent credit fulfillment (pattern from DELF B2 billing). */
export async function settleCreditPurchase(
  session: Stripe.Checkout.Session,
): Promise<SettleResult> {
  const sessionId = session.id;
  const purchaseId =
    session.metadata?.purchaseId || session.client_reference_id || null;

  let purchase = await prisma.creditPurchase.findUnique({
    where: { stripeSessionId: sessionId },
  });

  if (!purchase && purchaseId) {
    purchase = await prisma.creditPurchase.findUnique({
      where: { id: String(purchaseId) },
    });
  }

  if (!purchase) {
    return { claimed: false, reason: "purchase_not_found" };
  }

  if (purchase.status === "completed") {
    return { claimed: false, reason: "already_completed" };
  }

  if (purchase.purchaseType === "subscription") {
    return { claimed: false, reason: "subscription_checkout" };
  }

  if (
    typeof session.amount_total === "number" &&
    session.amount_total !== purchase.amountCents
  ) {
    await prisma.creditPurchase.updateMany({
      where: { id: purchase.id, status: "pending" },
      data: { status: "failed" },
    });
    return { claimed: false, reason: "amount_mismatch" };
  }

  const sessionCurrency = session.currency?.toLowerCase();
  if (sessionCurrency && sessionCurrency !== purchase.currency.toLowerCase()) {
    return { claimed: false, reason: "currency_mismatch" };
  }

  const claim = await prisma.creditPurchase.updateMany({
    where: { id: purchase.id, status: "pending" },
    data: {
      status: "completed",
      paidAt: new Date(),
      stripePaymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? undefined,
    },
  });

  if (claim.count === 0) {
    return { claimed: false, reason: "race_lost" };
  }

  const credits =
    Number(session.metadata?.credits) || purchase.credits;

  await addCredits(purchase.userId, credits, `stripe_purchase_${purchase.id}`);

  return { claimed: true, purchaseId: purchase.id };
}

export function shouldSettleCheckoutSession(
  session: Stripe.Checkout.Session,
  eventType: string,
): boolean {
  if (eventType === "checkout.session.async_payment_succeeded") {
    return true;
  }
  if (eventType === "checkout.session.completed") {
    return session.payment_status === "paid";
  }
  return false;
}

export async function closeExpiredPurchase(sessionId: string): Promise<void> {
  await prisma.creditPurchase.updateMany({
    where: { stripeSessionId: sessionId, status: "pending" },
    data: { status: "closed" },
  });
}
