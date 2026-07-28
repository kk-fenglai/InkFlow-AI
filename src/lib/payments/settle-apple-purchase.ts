import { addCreditsWithin } from "@/lib/credits";
import { prisma } from "@/lib/prisma";
import { findAppleProduct } from "@/lib/apple/products";
import { applySubscriptionPeriodWithin } from "@/lib/billing/subscription";

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
  } else if (purchase.userId !== input.userId) {
    // The transaction was already claimed by another account; never re-point the grant.
    return { ok: false, reason: "owned_by_other_user" };
  }

  const owner = purchase.userId;
  const claimed = await prisma.$transaction(async (tx) => {
    const claim = await tx.creditPurchase.updateMany({
      where: { id: purchase.id, status: "pending" },
      data: { status: "completed", paidAt: new Date() },
    });
    if (claim.count === 0) return false;

    await addCreditsWithin(
      tx,
      owner,
      product.credits,
      `apple_purchase_${purchase.id}`,
    );
    return true;
  });

  if (!claimed) {
    return { ok: false, reason: "already_completed" };
  }

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

  const originalTransactionId =
    input.originalTransactionId?.trim() || input.transactionId;

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
        appleOriginalTransactionId: originalTransactionId,
        packId: product.packId,
        purchaseType: "subscription",
        credits: product.credits,
        amountCents: product.amountCents,
        currency: product.currency,
        status: "pending",
      },
    });
  } else if (purchase.userId !== input.userId) {
    return { ok: false, reason: "owned_by_other_user" };
  } else if (!purchase.appleOriginalTransactionId) {
    await prisma.creditPurchase.update({
      where: { id: purchase.id },
      data: { appleOriginalTransactionId: originalTransactionId },
    });
  }

  const owner = purchase.userId;
  const claimed = await prisma.$transaction(async (tx) => {
    const claim = await tx.creditPurchase.updateMany({
      where: { id: purchase.id, status: "pending" },
      data: { status: "completed", paidAt: new Date() },
    });
    if (claim.count === 0) return false;

    await applySubscriptionPeriodWithin(tx, {
      userId: owner,
      sourcePurchaseId: purchase.id,
      credits: product.credits,
      plan: "pro",
    });
    return true;
  });

  if (!claimed) {
    return { ok: false, reason: "already_completed" };
  }

  return { ok: true, purchaseId: purchase.id, credits: product.credits };
}
