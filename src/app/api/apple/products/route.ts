import { appleProductCatalog } from "@/lib/apple/products";
import { getAuthenticatedUser } from "@/lib/session";
import {
  jsonWithMobileCors,
  mobileOptionsResponse,
} from "@/lib/mobile-auth/cors";

/** Product IDs for StoreKit configuration (no purchase yet). */
export async function OPTIONS(req: Request) {
  return mobileOptionsResponse(req);
}

export async function GET(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonWithMobileCors(
      req,
      { error: "Sign in required.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  return jsonWithMobileCors(req, {
    ok: true,
    products: appleProductCatalog().map((p) => ({
      productId: p.productId,
      kind: p.kind,
      packId: p.packId,
      credits: p.credits,
      amountCents: p.amountCents,
      currency: p.currency,
    })),
  });
}
