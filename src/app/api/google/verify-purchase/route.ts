import { findGoogleProduct } from "@/lib/google/products";
import { verifyGooglePlayPurchase } from "@/lib/google/verify-purchase";
import {
  settleGoogleCreditPurchase,
  settleGoogleSubscription,
} from "@/lib/payments/settle-google-purchase";
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
    productId?: string;
    purchaseToken?: string;
    productType?: "inapp" | "subs";
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

  const productId = body.productId?.trim() ?? "";
  const purchaseToken = body.purchaseToken?.trim() ?? "";
  if (!productId || !purchaseToken) {
    return jsonWithMobileCors(
      req,
      {
        error: "productId and purchaseToken required.",
        code: "VALIDATION",
      },
      { status: 400 },
    );
  }

  const product = findGoogleProduct(productId);
  if (!product) {
    return jsonWithMobileCors(
      req,
      { error: "Unknown product.", code: "UNKNOWN_PRODUCT" },
      { status: 400 },
    );
  }

  const verified = await verifyGooglePlayPurchase({
    productId,
    purchaseToken,
    productType: body.productType,
  });
  if ("error" in verified) {
    return jsonWithMobileCors(
      req,
      { error: "Purchase verification failed.", code: verified.error },
      { status: 400 },
    );
  }

  const result =
    verified.kind === "subscription"
      ? await settleGoogleSubscription({
          userId: user.id,
          purchaseToken: verified.purchaseToken,
          productId: verified.productId,
          orderId: verified.orderId,
        })
      : await settleGoogleCreditPurchase({
          userId: user.id,
          purchaseToken: verified.purchaseToken,
          productId: verified.productId,
          orderId: verified.orderId,
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
