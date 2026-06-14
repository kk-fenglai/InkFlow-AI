import type Stripe from "stripe";
import { CREDIT_PACKS } from "@/lib/constants";
import { getStripe } from "@/lib/stripe";

export type CreditPack = (typeof CREDIT_PACKS)[number];

const WALLET_METHODS = process.env.STRIPE_ENABLE_WALLET_PAY !== "false";

/** Resolve Stripe Price ID from env (optional Dashboard prices). */
export function stripePriceIdForPack(packId: string): string | null {
  const map: Record<string, string | undefined> = {
    pack_10: process.env.STRIPE_PRICE_10_CREDITS,
    pack_50: process.env.STRIPE_PRICE_50_CREDITS,
    pack_200: process.env.STRIPE_PRICE_200_CREDITS,
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

  const amountCents = Math.round(input.pack.priceUsd * 100);
  const stripePriceId = stripePriceIdForPack(input.pack.id);

  const paymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] =
    WALLET_METHODS ? ["card", "wechat_pay", "alipay"] : ["card"];

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = stripePriceId
    ? [{ price: stripePriceId, quantity: 1 }]
    : [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: `InkFlow AI — ${input.pack.label}`,
              description: input.pack.description,
            },
          },
        },
      ];

  return stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: paymentMethodTypes,
    ...(WALLET_METHODS
      ? { payment_method_options: { wechat_pay: { client: "web" } } }
      : {}),
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
}
