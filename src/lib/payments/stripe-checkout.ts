import type Stripe from "stripe";
import { CREDIT_PACKS, CREDIT_PACK_CURRENCY } from "@/lib/constants";
import { getStripe } from "@/lib/stripe";

export type CreditPack = (typeof CREDIT_PACKS)[number];

const WALLET_METHODS = process.env.STRIPE_ENABLE_WALLET_PAY !== "false";

/** Resolve Stripe Price ID from env (optional Dashboard prices). */
export function stripePriceIdForPack(packId: string): string | null {
  const map: Record<string, string | undefined> = {
    pack_20: process.env.STRIPE_PRICE_20_CREDITS,
    pack_50: process.env.STRIPE_PRICE_50_CREDITS,
    pack_120: process.env.STRIPE_PRICE_120_CREDITS,
  };
  const id = map[packId]?.trim();
  return id && id.length > 0 ? id : null;
}

export async function createCreditCheckoutSession(input: {
  purchaseId: string;
  userId: string;
  pack: CreditPack;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string | null;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error("Stripe not configured");
  }

  const amountCents = Math.round(input.pack.priceEur * 100);
  const stripePriceId = stripePriceIdForPack(input.pack.id);

  const dynamicLineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
    quantity: 1,
    price_data: {
      currency: CREDIT_PACK_CURRENCY,
      unit_amount: amountCents,
      product_data: {
        name: `InkFlow AI — ${input.pack.label}`,
        description: input.pack.description,
      },
    },
  };

  const lineItemSets: Stripe.Checkout.SessionCreateParams.LineItem[][] =
    stripePriceId
      ? [[{ price: stripePriceId, quantity: 1 }], [dynamicLineItem]]
      : [[dynamicLineItem]];

  const sessionBase = (lineItems: Stripe.Checkout.SessionCreateParams.LineItem[]) => ({
    mode: "payment" as const,
    line_items: lineItems,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    client_reference_id: input.purchaseId,
    customer_email: input.customerEmail ?? undefined,
    metadata: {
      purchaseId: input.purchaseId,
      userId: input.userId,
      packId: input.pack.id,
      credits: String(input.pack.credits),
    },
  });

  const methodSets: Stripe.Checkout.SessionCreateParams.PaymentMethodType[][] =
    WALLET_METHODS
      ? [["card", "wechat_pay", "alipay"], ["card"]]
      : [["card"]];

  let lastError: unknown;
  for (const lineItems of lineItemSets) {
    for (const paymentMethodTypes of methodSets) {
      try {
        return await stripe.checkout.sessions.create({
          ...sessionBase(lineItems),
          payment_method_types: paymentMethodTypes,
          ...(paymentMethodTypes.includes("wechat_pay")
            ? { payment_method_options: { wechat_pay: { client: "web" } } }
            : {}),
        });
      } catch (err) {
        lastError = err;
        const msg = err instanceof Error ? err.message : "";
        const isLastMethod = paymentMethodTypes.length === 1;
        const isLastLineItems = lineItems === lineItemSets[lineItemSets.length - 1];
        if (!isLastMethod) {
          console.warn("[stripe] wallet checkout failed, retrying card-only:", msg);
          continue;
        }
        if (!isLastLineItems && /recurring price|one-time prices/i.test(msg)) {
          console.warn("[stripe] configured price invalid for one-time checkout, using price_data:", msg);
          break;
        }
      }
    }
  }

  throw lastError ?? new Error("Stripe checkout session creation failed");
}
