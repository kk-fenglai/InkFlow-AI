import { findAppleProduct } from "@/lib/apple/products";
import {
  parseAppleJws,
  readAppleString,
  type AppleJwsPayload,
} from "@/lib/apple/parse-jws";
import { revokeSubscriptionPurchase } from "@/lib/billing/subscription";
import { prisma } from "@/lib/prisma";
import {
  settleAppleCreditPurchase,
  settleAppleSubscription,
} from "@/lib/payments/settle-apple-purchase";

export type AppleNotificationEnvelope = {
  notificationType?: string;
  subtype?: string;
  data?: {
    signedTransactionInfo?: string;
    signedRenewalInfo?: string;
    environment?: string;
  };
};

async function findUserIdForAppleSubscription(
  originalTransactionId: string,
): Promise<string | null> {
  const purchase = await prisma.creditPurchase.findFirst({
    where: {
      paymentProvider: "apple",
      purchaseType: "subscription",
      OR: [
        { appleOriginalTransactionId: originalTransactionId },
        { appleTransactionId: originalTransactionId },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: { userId: true },
  });
  return purchase?.userId ?? null;
}

async function markApplePurchaseRefunded(transactionId: string): Promise<void> {
  const purchase = await prisma.creditPurchase.findUnique({
    where: { appleTransactionId: transactionId },
    select: { id: true, credits: true, status: true },
  });
  if (!purchase || purchase.status === "refunded") return;

  await revokeSubscriptionPurchase({
    purchaseId: purchase.id,
    creditsToClawBack: purchase.credits,
  });

  await prisma.creditPurchase.update({
    where: { id: purchase.id },
    data: { status: "refunded" },
  });
}

async function fulfillFromTransactionClaims(
  claims: AppleJwsPayload,
  userId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const transactionId = readAppleString(claims, "transactionId");
  const productId = readAppleString(claims, "productId");
  const originalTransactionId =
    readAppleString(claims, "originalTransactionId") ?? transactionId;

  if (!transactionId || !productId) {
    return { ok: false, reason: "missing_claims" };
  }

  const product = findAppleProduct(productId);
  if (!product) return { ok: false, reason: "unknown_product" };

  const result =
    product.kind === "subscription"
      ? await settleAppleSubscription({
          userId,
          transactionId,
          productId,
          originalTransactionId,
        })
      : await settleAppleCreditPurchase({
          userId,
          transactionId,
          productId,
        });

  if (!result.ok && result.reason !== "already_completed") {
    return { ok: false, reason: result.reason };
  }
  return { ok: true };
}

/**
 * Handle App Store Server Notifications V2.
 * Returns ok:true when Apple should receive HTTP 200.
 */
export async function handleAppleServerNotification(
  signedPayload: string,
): Promise<{ ok: true; handled: string } | { ok: false; error: string }> {
  const payload = await parseAppleJws(signedPayload);
  if ("error" in payload) {
    return { ok: false, error: String(payload.error) };
  }

  const notificationType = readAppleString(payload, "notificationType") ?? "";
  const subtype = readAppleString(payload, "subtype") ?? "";
  const data = payload.data as AppleNotificationEnvelope["data"] | undefined;
  const signedTransactionInfo = data?.signedTransactionInfo;

  let transactionClaims: AppleJwsPayload | null = null;
  if (signedTransactionInfo) {
    const decoded = await parseAppleJws(signedTransactionInfo);
    if (!("error" in decoded)) {
      transactionClaims = decoded;
    }
  }

  const transactionId = transactionClaims
    ? readAppleString(transactionClaims, "transactionId")
    : undefined;
  const originalTransactionId = transactionClaims
    ? (readAppleString(transactionClaims, "originalTransactionId") ??
      transactionId)
    : undefined;

  console.info("[apple/webhook]", {
    notificationType,
    subtype,
    transactionId,
    originalTransactionId,
  });

  switch (notificationType) {
    case "TEST":
      return { ok: true, handled: "test" };

    case "SUBSCRIBED":
    case "DID_RENEW":
    case "OFFER_REDEEMED":
    case "DID_CHANGE_RENEWAL_PREF":
    case "RENEWAL_EXTENDED": {
      if (!transactionClaims || !originalTransactionId) {
        return { ok: true, handled: "renewal_no_transaction" };
      }
      const userId = await findUserIdForAppleSubscription(
        originalTransactionId,
      );
      if (!userId) {
        console.warn("[apple/webhook] renewal without mapped user", {
          originalTransactionId,
        });
        return { ok: true, handled: "renewal_user_not_found" };
      }
      await fulfillFromTransactionClaims(transactionClaims, userId);
      return { ok: true, handled: "renewal_fulfilled" };
    }

    case "REFUND":
    case "REVOKE": {
      if (!transactionId) {
        return { ok: true, handled: "refund_no_transaction" };
      }
      await markApplePurchaseRefunded(transactionId);
      return { ok: true, handled: notificationType.toLowerCase() };
    }

    case "EXPIRED":
    case "DID_FAIL_TO_RENEW":
    case "GRACE_PERIOD_EXPIRED":
      return { ok: true, handled: notificationType.toLowerCase() };

    default:
      return { ok: true, handled: `ignored:${notificationType || "unknown"}` };
  }
}
