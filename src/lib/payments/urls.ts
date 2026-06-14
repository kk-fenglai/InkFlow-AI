/** Checkout redirect URLs (B2-style `{PURCHASE_ID}` / `{ORDER_ID}` placeholders). */
export function appOrigin(fallback = "http://localhost:3000"): string {
  return process.env.NEXTAUTH_URL ?? fallback;
}

export function checkoutSuccessUrl(purchaseId: string, origin?: string): string {
  const base = origin ?? appOrigin();
  const template = process.env.STRIPE_CHECKOUT_SUCCESS_URL;
  if (template) {
    return template
      .replace(/\{PURCHASE_ID\}/g, purchaseId)
      .replace(/\{ORDER_ID\}/g, purchaseId);
  }
  return `${base}/checkout/success?purchaseId=${encodeURIComponent(purchaseId)}`;
}

export function checkoutCancelUrl(purchaseId: string, origin?: string): string {
  const base = origin ?? appOrigin();
  const template = process.env.STRIPE_CHECKOUT_CANCEL_URL;
  if (template) {
    return template
      .replace(/\{PURCHASE_ID\}/g, purchaseId)
      .replace(/\{ORDER_ID\}/g, purchaseId);
  }
  return `${base}/checkout/cancel?purchaseId=${encodeURIComponent(purchaseId)}`;
}
