import { findAppleProduct } from "@/lib/apple/products";
import { parseAppleSignedTransaction } from "@/lib/apple/verify-transaction";
import {
  settleAppleCreditPurchase,
  settleAppleSubscription,
} from "@/lib/payments/settle-apple-purchase";
import { getAuthenticatedUser } from "@/lib/session";
import {
  jsonWithMobileCors,
  mobileOptionsResponse,
} from "@/lib/mobile-auth/cors";

export async function OPTIONS(req: Request) {
  return mobileOptionsResponse(req);
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonWithMobileCors(
      req,
      { error: "Sign in required.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  let body: {
    signedTransaction?: string;
    transactionId?: string;
    productId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonWithMobileCors(
      req,
      { error: "Invalid JSON", code: "INVALID_JSON" },
      { status: 400 },
    );
  }

  // Unsigned transactionId + productId is only trusted in dev, behind the same
  // flag that disables JWS verification. Otherwise credits could be minted by
  // posting an arbitrary product id.
  const allowUnsigned =
    process.env.APPLE_IAP_SKIP_VERIFY === "true" &&
    process.env.NODE_ENV !== "production";

  let transactionId = allowUnsigned ? (body.transactionId?.trim() ?? "") : "";
  let productId = allowUnsigned ? (body.productId?.trim() ?? "") : "";

  if (body.signedTransaction?.trim()) {
    const parsed = await parseAppleSignedTransaction(body.signedTransaction.trim());
    if ("error" in parsed) {
      return jsonWithMobileCors(
        req,
        { error: "Transaction verification failed.", code: parsed.error },
        { status: 400 },
      );
    }
    transactionId = parsed.transactionId;
    productId = parsed.productId;
  }

  if (!transactionId || !productId) {
    return jsonWithMobileCors(
      req,
      {
        error: "signedTransaction required.",
        code: "VALIDATION",
      },
      { status: 400 },
    );
  }

  const product = findAppleProduct(productId);
  if (!product) {
    return jsonWithMobileCors(
      req,
      { error: "Unknown product.", code: "UNKNOWN_PRODUCT" },
      { status: 400 },
    );
  }

  const result =
    product.kind === "subscription"
      ? await settleAppleSubscription({
          userId: user.id,
          transactionId,
          productId,
        })
      : await settleAppleCreditPurchase({
          userId: user.id,
          transactionId,
          productId,
        });

  if (!result.ok) {
    const status = result.reason === "already_completed" ? 200 : 400;
    return jsonWithMobileCors(
      req,
      {
        ok: result.reason === "already_completed",
        reason: result.reason,
        message:
          result.reason === "already_completed"
            ? "Purchase already fulfilled."
            : "Could not fulfill purchase.",
      },
      { status },
    );
  }

  const refreshed = await getAuthenticatedUser();

  return jsonWithMobileCors(req, {
    ok: true,
    purchaseId: result.purchaseId,
    creditsGranted: result.credits,
    credits: refreshed?.credits ?? user.credits + result.credits,
    plan: refreshed?.plan ?? user.plan,
  });
}
