import { google } from "googleapis";
import { findGoogleProduct } from "@/lib/google/products";

export type GoogleVerifiedPurchase = {
  productId: string;
  purchaseToken: string;
  orderId?: string;
  kind: "credits" | "subscription";
};

function packageName(): string {
  return (
    process.env.GOOGLE_PLAY_PACKAGE_NAME?.trim() || "com.inkflow.ai"
  );
}

function skipVerify(): boolean {
  return (
    process.env.GOOGLE_PLAY_SKIP_VERIFY === "true" &&
    process.env.NODE_ENV !== "production"
  );
}

function getServiceAccountCredentials(): object | null {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as object;
  } catch {
    return null;
  }
}

/**
 * Verify a Google Play purchase with Android Publisher API.
 * Dev: set GOOGLE_PLAY_SKIP_VERIFY=true to accept token+productId without API call.
 */
export async function verifyGooglePlayPurchase(input: {
  productId: string;
  purchaseToken: string;
  productType?: "inapp" | "subs";
}): Promise<GoogleVerifiedPurchase | { error: string }> {
  const product = findGoogleProduct(input.productId);
  if (!product) {
    return { error: "unknown_product" };
  }

  const purchaseToken = input.purchaseToken.trim();
  if (!purchaseToken) {
    return { error: "missing_token" };
  }

  if (skipVerify()) {
    return {
      productId: input.productId,
      purchaseToken,
      orderId: `dev-${purchaseToken.slice(0, 16)}`,
      kind: product.kind,
    };
  }

  const credentials = getServiceAccountCredentials();
  if (!credentials) {
    return { error: "missing_service_account" };
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });
    const androidpublisher = google.androidpublisher({
      version: "v3",
      auth,
    });
    const pkg = packageName();

    if (product.kind === "subscription") {
      const res = await androidpublisher.purchases.subscriptions.get({
        packageName: pkg,
        subscriptionId: input.productId,
        token: purchaseToken,
      });
      const data = res.data;
      if (data.paymentState !== 1 && data.paymentState !== 2) {
        // 1 = received, 2 = free trial / pending deferred — accept received
        if (data.paymentState !== undefined && data.paymentState === 0) {
          return { error: "payment_pending" };
        }
      }
      return {
        productId: input.productId,
        purchaseToken,
        orderId: data.orderId ?? undefined,
        kind: "subscription",
      };
    }

    const res = await androidpublisher.purchases.products.get({
      packageName: pkg,
      productId: input.productId,
      token: purchaseToken,
    });
    const data = res.data;
    // 0 = purchased, 1 = canceled, 2 = pending
    if (data.purchaseState !== 0) {
      return { error: "not_purchased" };
    }

    return {
      productId: input.productId,
      purchaseToken,
      orderId: data.orderId ?? undefined,
      kind: "credits",
    };
  } catch (e) {
    console.error("[google/verify]", e);
    return { error: "verify_failed" };
  }
}
