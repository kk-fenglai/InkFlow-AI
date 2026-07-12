import { addCredits } from "@/lib/credits";
import { prisma } from "@/lib/prisma";
import { findAppleProduct } from "@/lib/apple/products";
import { applySubscriptionPeriod } from "@/lib/billing/subscription";

export type AppleSettleResult =
  | { ok: true; purchaseId: string; credits: number }
  | { ok: false; reason: string };

/** Idempotent fulfillment for Apple IAP credit packs. */
export async function settleAppleCreditPurchase(input: {
  userId: string;
  transactionId: string;
  productId: string;
}): Promise<AppleSettleResult> {
  const product = findAppleProduct(input.productId);
  if (!product || product.kind !== "credits") {
    return { ok: false, reason: "unknown_product" };
  }

  const existing = await prisma.creditPurchase.findUnique({
    where: { appleTransactionId: input.transactionId },
  });
  if (existing?.status === "completed") {
    return { ok: false, reason: "already_completed" };
  }

  const sessionKey = `apple:${input.transactionId}`;

  let purchase = await prisma.creditPurchase.findUnique({
    where: { stripeSessionId: sessionKey },
  });

  if (!purchase) {
    purchase = await prisma.creditPurchase.create({
      data: {
        userId: input.userId,
        paymentProvider: "apple",
        stripeSessionId: sessionKey,
        appleTransactionId: input.transactionId,
        packId: product.packId,
        purchaseType: "credits",
        credits: product.credits,
        amountCents: product.amountCents,
        currency: product.currency,
        status: "pending",
      },
    });
  }

  const claim = await prisma.creditPurchase.updateMany({
    where: { id: purchase.id, status: "pending" },
    data: { status: "completed", paidAt: new Date() },
  });

  if (claim.count === 0) {
    return { ok: false, reason: "already_completed" };
  }

  await addCredits(
    input.userId,
    product.credits,
    `apple_purchase_${purchase.id}`,
  );

  return { ok: true, purchaseId: purchase.id, credits: product.credits };
}

/** Idempotent fulfillment for Apple auto-renewable subscription (initial purchase). */
export async function settleAppleSubscription(input: {
  userId: string;
  transactionId: string;
  productId: string;
  originalTransactionId?: string;
}): Promise<AppleSettleResult> {
  const product = findAppleProduct(input.productId);
  if (!product || product.kind !== "subscription") {
    return { ok: false, reason: "unknown_product" };
  }

  const existing = await prisma.creditPurchase.findUnique({
    where: { appleTransactionId: input.transactionId },
  });
  if (existing?.status === "completed") {
    return { ok: false, reason: "already_completed" };
  }

  const sessionKey = `apple:${input.transactionId}`;

  let purchase = await prisma.creditPurchase.findUnique({
    where: { stripeSessionId: sessionKey },
  });

  if (!purchase) {
    purchase = await prisma.creditPurchase.create({
      data: {
        userId: input.userId,
        paymentProvider: "apple",
        stripeSessionId: sessionKey,
        appleTransactionId: input.transactionId,
        packId: product.packId,
        purchaseType: "subscription",
        credits: product.credits,
        amountCents: product.amountCents,
        currency: product.currency,
        status: "pending",
      },
    });
  }

  const claim = await prisma.creditPurchase.updateMany({
    where: { id: purchase.id, status: "pending" },
    data: { status: "completed", paidAt: new Date() },
  });

  if (claim.count === 0) {
    return { ok: false, reason: "already_completed" };
  }

  await applySubscriptionPeriod({
    userId: input.userId,
    sourcePurchaseId: purchase.id,
    credits: product.credits,
    plan: "pro",
  });

  return { ok: true, purchaseId: purchase.id, credits: product.credits };
}
