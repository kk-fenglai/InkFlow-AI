import { CREDIT_PACKS, SUBSCRIPTION_PLAN } from "@/lib/constants";

export type AppleProductKind = "credits" | "subscription";

export type AppleProductMapping = {
  productId: string;
  kind: AppleProductKind;
  packId: string;
  credits: number;
  amountCents: number;
  currency: string;
};

function envProductId(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback;
}

/** Map App Store product IDs to credit packs / subscription (configure in App Store Connect). */
export function appleProductCatalog(): AppleProductMapping[] {
  return [
    {
      productId: envProductId("APPLE_IAP_PACK_20", "com.inkflow.ai.credits.20"),
      kind: "credits",
      packId: CREDIT_PACKS[0].id,
      credits: CREDIT_PACKS[0].credits,
      amountCents: Math.round(CREDIT_PACKS[0].priceEur * 100),
      currency: "eur",
    },
    {
      productId: envProductId("APPLE_IAP_PACK_50", "com.inkflow.ai.credits.50"),
      kind: "credits",
      packId: CREDIT_PACKS[1].id,
      credits: CREDIT_PACKS[1].credits,
      amountCents: Math.round(CREDIT_PACKS[1].priceEur * 100),
      currency: "eur",
    },
    {
      productId: envProductId("APPLE_IAP_PACK_120", "com.inkflow.ai.credits.120"),
      kind: "credits",
      packId: CREDIT_PACKS[2].id,
      credits: CREDIT_PACKS[2].credits,
      amountCents: Math.round(CREDIT_PACKS[2].priceEur * 100),
      currency: "eur",
    },
    {
      productId: envProductId(
        "APPLE_IAP_PRO_MONTHLY",
        "com.inkflow.ai.pro.monthly",
      ),
      kind: "subscription",
      packId: SUBSCRIPTION_PLAN.id,
      credits: SUBSCRIPTION_PLAN.creditsPerMonth,
      amountCents: Math.round(SUBSCRIPTION_PLAN.priceEur * 100),
      currency: "eur",
    },
  ];
}

export function findAppleProduct(
  productId: string,
): AppleProductMapping | undefined {
  return appleProductCatalog().find((p) => p.productId === productId);
}
