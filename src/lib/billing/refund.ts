import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { revokeSubscriptionPurchase } from "@/lib/billing/subscription";

export async function refundPurchase(input: {
  purchaseId: string;
  amountCents?: number;
  reason?: string;
  operatorId: string;
}): Promise<{ ok: true; refundId: string } | { ok: false; error: string }> {
  const purchase = await prisma.creditPurchase.findUnique({
    where: { id: input.purchaseId },
    include: { user: { select: { email: true } } },
  });

  if (!purchase) {
    return { ok: false, error: "Purchase not found." };
  }

  if (purchase.status !== "completed" && purchase.status !== "refunded") {
    return { ok: false, error: "Only completed purchases can be refunded." };
  }

  const remaining = purchase.amountCents - purchase.refundedCents;
  const amountCents = input.amountCents ?? remaining;

  if (amountCents <= 0 || amountCents > remaining) {
    return { ok: false, error: "Invalid refund amount." };
  }

  const stripe = getStripe();
  if (!stripe) {
    return { ok: false, error: "Stripe not configured." };
  }

  const paymentIntentId = purchase.stripePaymentIntentId;
  if (!paymentIntentId?.startsWith("pi_")) {
    return {
      ok: false,
      error: "No payment intent on record — cannot refund via Stripe.",
    };
  }

  const refundRecord = await prisma.refundOrder.create({
    data: {
      purchaseId: purchase.id,
      amountCents,
      reason: input.reason ?? "admin_refund",
      operatorId: input.operatorId,
      status: "pending",
    },
  });

  let stripeRefundId: string | null = null;

  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amountCents,
      metadata: {
        purchaseId: purchase.id,
        refundOrderId: refundRecord.id,
      },
    });
    stripeRefundId = refund.id;
  } catch (e) {
    await prisma.refundOrder.update({
      where: { id: refundRecord.id },
      data: { status: "failed" },
    });
    const msg = e instanceof Error ? e.message : "Stripe refund failed.";
    return { ok: false, error: msg };
  }

  const fullRefund = amountCents >= remaining;

  // On a final refund, claw back only what earlier partial refunds left behind,
  // otherwise the full grant is deducted a second time.
  const prior = await prisma.refundOrder.aggregate({
    where: {
      purchaseId: purchase.id,
      status: "succeeded",
      id: { not: refundRecord.id },
    },
    _sum: { creditsClawedBack: true },
  });
  const alreadyClawedBack = prior._sum.creditsClawedBack ?? 0;

  const creditsClawBack = fullRefund
    ? Math.max(0, purchase.credits - alreadyClawedBack)
    : Math.round(purchase.credits * (amountCents / purchase.amountCents));

  await prisma.refundOrder.update({
    where: { id: refundRecord.id },
    data: {
      status: "succeeded",
      stripeRefundId,
      creditsClawedBack: creditsClawBack,
    },
  });

  await prisma.creditPurchase.update({
    where: { id: purchase.id },
    data: {
      refundedCents: purchase.refundedCents + amountCents,
      status: fullRefund ? "refunded" : purchase.status,
    },
  });

  await revokeSubscriptionPurchase({
    purchaseId: purchase.id,
    creditsToClawBack: creditsClawBack,
    // A partial refund should not wipe out the whole paid period.
    revokePeriod: fullRefund,
  });

  return { ok: true, refundId: refundRecord.id };
}
