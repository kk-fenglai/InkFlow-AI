const base = "https://ink-flow-ai-nine.vercel.app";
const jar = new Map();

function storeCookies(res) {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    if (i > 0) jar.set(pair.slice(0, i).trim(), pair.slice(i + 1));
  }
}
function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

const csrfRes = await fetch(`${base}/api/auth/csrf`);
storeCookies(csrfRes);
const { csrfToken } = await csrfRes.json();

const email = `stripe-test-${Date.now()}@example.com`;
const password = "TestPass123!";

await fetch(`${base}/api/auth/register`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password, name: "Stripe Test" }),
});

const loginRes = await fetch(`${base}/api/auth/callback/credentials`, {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    Cookie: cookieHeader(),
  },
  body: new URLSearchParams({
    csrfToken,
    email,
    password: password,
    callbackUrl: `${base}/account`,
    json: "true",
  }),
  redirect: "manual",
});
storeCookies(loginRes);
console.log("login:", loginRes.status, loginRes.headers.get("location") ?? "");

const checkoutRes = await fetch(`${base}/api/stripe/checkout`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Cookie: cookieHeader(),
  },
  body: JSON.stringify({ packId: "pack_10" }),
});
const body = await checkoutRes.text();
console.log("status:", checkoutRes.status);
console.log("body:", body.slice(0, 300));
