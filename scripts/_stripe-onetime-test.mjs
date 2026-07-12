import { readFileSync } from "node:fs";
import Stripe from "stripe";

const env = {};
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq < 1) continue;
  const key = trimmed.slice(0, eq).trim();
  let val = trimmed.slice(eq + 1).trim();
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }
  env[key] = val;
}

const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2026-05-27.dahlia" });

for (const [label, cents] of [
  ["10 pack", 50],
  ["50 pack", 100],
  ["200 pack", 150],
]) {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: cents,
            product_data: { name: `InkFlow ${label}` },
          },
        },
      ],
      success_url: "https://ink-flow-ai-nine.vercel.app/checkout/success",
      cancel_url: "https://ink-flow-ai-nine.vercel.app/checkout/cancel",
    });
    console.log(`OK ${label} $${(cents / 100).toFixed(2)}:`, session.url?.slice(0, 55));
  } catch (e) {
    console.log(`ERR ${label}:`, e.message);
  }
}
