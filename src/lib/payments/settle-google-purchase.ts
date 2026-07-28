import { addCreditsWithin } from "@/lib/credits";
import { prisma } from "@/lib/prisma";
import { findGoogleProduct } from "@/lib/google/products";
import { applySubscriptionPeriodWithin } from "@/lib/billing/subscription";

export type GoogleSettleResult =
  | { ok: true; purchaseId: string; credits: number }
  | { ok: false; reason: string };

/** Idempotent fulfillment for Google Play credit packs. */
export async function settleGoogleCreditPurchase(input: {
  userId: string;
  purchaseToken: string;
  productId: string;
  orderId?: string;
}): Promise<GoogleSettleResult> {
  const product = findGoogleProduct(input.productId);
  if (!product || product.kind !== "credits") {
    return { ok: false, reason: "unknown_product" };
  }

  const existing = await prisma.creditPurchase.findUnique({
    where: { googlePurchaseToken: input.purchaseToken },
  });
  if (existing?.status === "completed") {
    return { ok: false, reason: "already_completed" };
  }

  const sessionKey = `google:${input.purchaseToken}`;

  let purchase = await prisma.creditPurchase.findUnique({
    where: { stripeSessionId: sessionKey },
  });

  if (!purchase) {
    purchase = await prisma.creditPurchase.create({
      data: {
        userId: input.userId,
        paymentProvider: "google",
        stripeSessionId: sessionKey,
        googlePurchaseToken: input.purchaseToken,
        googleOrderId: input.orderId ?? null,
        packId: product.packId,
        purchaseType: "credits",
        credits: product.credits,
        amountCents: product.amountCents,
        currency: product.currency,
        status: "pending",
      },
    });
  } else if (purchase.userId !== input.userId) {
    // The token was already claimed by another account; never re-point the grant.
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
      `google_purchase_${purchase.id}`,
    );
    return true;
  });

  if (!claimed) {
    return { ok: false, reason: "already_completed" };
  }

  return { ok: true, purchaseId: purchase.id, credits: product.credits };
}

/** Idempotent fulfillment for Google Play subscriptions. */
export async function settleGoogleSubscription(input: {
  userId: string;
  purchaseToken: string;
  productId: string;
  orderId?: string;
}): Promise<GoogleSettleResult> {
  const product = findGoogleProduct(input.productId);
  if (!product || product.kind !== "subscription") {
    return { ok: false, reason: "unknown_product" };
  }

  const existing = await prisma.creditPurchase.findUnique({
    where: { googlePurchaseToken: input.purchaseToken },
  });
  if (existing?.status === "completed") {
    return { ok: false, reason: "already_completed" };
  }

  const sessionKey = `google:${input.purchaseToken}`;

  let purchase = await prisma.creditPurchase.findUnique({
    where: { stripeSessionId: sessionKey },
  });

  if (!purchase) {
    purchase = await prisma.creditPurchase.create({
      data: {
        userId: input.userId,
        paymentProvider: "google",
        stripeSessionId: sessionKey,
        googlePurchaseToken: input.purchaseToken,
        googleOrderId: input.orderId ?? null,
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
