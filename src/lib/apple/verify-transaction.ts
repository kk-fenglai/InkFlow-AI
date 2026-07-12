import { decodeProtectedHeader, importX509, jwtVerify } from "jose";
import { findAppleProduct } from "@/lib/apple/products";

export type AppleTransactionClaims = {
  transactionId: string;
  productId: string;
  bundleId?: string;
  environment?: string;
};

/**
 * Decode StoreKit 2 signed transaction JWS.
 * When APPLE_IAP_SKIP_VERIFY=true (dev only), parses payload without crypto.
 */
export async function parseAppleSignedTransaction(
  signedTransaction: string,
): Promise<AppleTransactionClaims | { error: string }> {
  const skipVerify = process.env.APPLE_IAP_SKIP_VERIFY === "true";
  const expectedBundle = process.env.APPLE_BUNDLE_ID?.trim();

  try {
    if (skipVerify && process.env.NODE_ENV !== "production") {
      const parts = signedTransaction.split(".");
      if (parts.length < 2) {
        return { error: "invalid_jws" };
      }
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64url").toString("utf8"),
      ) as Record<string, unknown>;
      const transactionId = String(payload.transactionId ?? "");
      const productId = String(payload.productId ?? "");
      if (!transactionId || !productId) {
        return { error: "missing_claims" };
      }
      return {
        transactionId,
        productId,
        bundleId: payload.bundleId ? String(payload.bundleId) : undefined,
        environment: payload.environment ? String(payload.environment) : undefined,
      };
    }

    const header = decodeProtectedHeader(signedTransaction);
    const x5c = header.x5c;
    if (!x5c?.[0]) {
      return { error: "missing_x5c" };
    }

    const cert = `-----BEGIN CERTIFICATE-----\n${x5c[0]}\n-----END CERTIFICATE-----`;
    const key = await importX509(cert, header.alg ?? "ES256");
    const { payload } = await jwtVerify(signedTransaction, key);

    const transactionId = String(payload.transactionId ?? "");
    const productId = String(payload.productId ?? "");
    if (!transactionId || !productId) {
      return { error: "missing_claims" };
    }

    const bundleId = payload.bundleId ? String(payload.bundleId) : undefined;
    if (expectedBundle && bundleId && bundleId !== expectedBundle) {
      return { error: "bundle_mismatch" };
    }

    if (!findAppleProduct(productId)) {
      return { error: "unknown_product" };
    }

    return {
      transactionId,
      productId,
      bundleId,
      environment: payload.environment ? String(payload.environment) : undefined,
    };
  } catch {
    return { error: "verify_failed" };
  }
}
