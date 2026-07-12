import { readFileSync } from "node:fs";
import Stripe from "stripe";

const k = readFileSync(".env", "utf8").match(/STRIPE_SECRET_KEY="([^"]+)"/)?.[1];
const stripe = new Stripe(k, { apiVersion: "2026-05-27.dahlia" });

for (const c of [50, 55, 58, 59, 60, 65]) {
  try {
    await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: { currency: "usd", unit_amount: c, product_data: { name: "t" } },
        },
      ],
      success_url: "https://example.com/s",
      cancel_url: "https://example.com/c",
    });
    console.log("OK cents:", c);
  } catch (e) {
    console.log("fail", c, ":", e.message.slice(0, 100));
  }
}
