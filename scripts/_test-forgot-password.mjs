const base = "https://signaturegeneratorai.vercel.app";

const res = await fetch(`${base}/api/auth/forgot-password`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "dengfenglai1210@gmail.com" }),
});
const data = await res.json();
console.log("status:", res.status);
console.log("body:", JSON.stringify(data));
