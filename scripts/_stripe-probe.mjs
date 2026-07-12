import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = {};
for (const line of readFileSync(join(root, ".env"), "utf8").split(/\r?\n/)) {
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

const k = env.STRIPE_SECRET_KEY ?? "";
console.log("key:", k.slice(0, 14) + "...", "len:", k.length, "live:", k.startsWith("sk_live"));
console.log("price_10:", env.STRIPE_PRICE_10_CREDITS);

const Stripe = (await import("stripe")).default;
const stripe = new Stripe(k, { apiVersion: "2026-05-27.dahlia" });

for (const types of [
  ["card", "wechat_pay", "alipay"],
  ["card"],
]) {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: types,
      ...(types.includes("wechat_pay")
        ? { payment_method_options: { wechat_pay: { client: "web" } } }
        : {}),
      line_items: [{ price: env.STRIPE_PRICE_10_CREDITS, quantity: 1 }],
      success_url: "https://ink-flow-ai-nine.vercel.app/checkout/success",
      cancel_url: "https://ink-flow-ai-nine.vercel.app/checkout/cancel",
    });
    console.log(`OK [${types.join(",")}]:`, session.url?.slice(0, 55) + "...");
    process.exit(0);
  } catch (e) {
    console.log(`ERR [${types.join(",")}]:`, e.message);
  }
}
process.exit(1);
