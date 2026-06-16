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

const apiKey = env.BREVO_API_KEY;
const smtpPass = env.SMTP_PASS;
console.log("BREVO_API_KEY:", apiKey ? `${apiKey.slice(0, 12)}... len ${apiKey.length}` : "(missing)");
console.log("SMTP_PASS:", smtpPass ? `set len ${smtpPass.length}` : "(missing)");

const to = "dengfenglai1210@gmail.com";
const from = env.EMAIL_FROM || "InkFlow AI <dengfenglai1210@gmail.com>";

if (apiKey) {
  const match = from.match(/^(.+?)\s*<([^>]+)>$/);
  const sender = match
    ? { name: match[1].trim(), email: match[2].trim() }
    : { name: "InkFlow AI", email: from };

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to }],
      subject: "InkFlow AI — Brevo API test",
      htmlContent: "<p>Brevo API is working.</p>",
    }),
  });
  console.log("API test:", res.status, (await res.text()).slice(0, 200));
} else if (smtpPass) {
  const nodemailer = (await import("nodemailer")).default;
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST || "smtp-relay.brevo.com",
    port: Number(env.SMTP_PORT ?? "587"),
    secure: false,
    auth: { user: env.SMTP_USER, pass: smtpPass },
  });
  try {
    const info = await transport.sendMail({
      from,
      to,
      subject: "InkFlow AI — SMTP test",
      text: "SMTP is working.",
    });
    console.log("SMTP test OK:", info.messageId);
  } catch (e) {
    console.log("SMTP test FAIL:", e instanceof Error ? e.message : e);
  }
}
