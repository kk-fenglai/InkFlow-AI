import { readFileSync } from "node:fs";

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

const Stripe = (await import("stripe")).default;
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-05-27.dahlia",
});

for (const [name, id] of [
  ["10", env.STRIPE_PRICE_10_CREDITS],
  ["50", env.STRIPE_PRICE_50_CREDITS],
  ["200", env.STRIPE_PRICE_200_CREDITS],
]) {
  const p = await stripe.prices.retrieve(id);
  console.log(
    `${name} ${id} type=${p.type} recurring=${p.recurring?.interval ?? "none"} amount=${p.unit_amount}`,
  );
}
