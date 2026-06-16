import { readFileSync } from "node:fs";
import nodemailer from "nodemailer";

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

const to = process.argv[2] ?? "dengfenglai1210@gmail.com";
console.log("SMTP_USER:", env.SMTP_USER);
console.log("SMTP_PASS len:", env.SMTP_PASS?.length ?? 0);
console.log("EMAIL_FROM:", env.EMAIL_FROM);
console.log("Sending test to:", to);

const transport = nodemailer.createTransport({
  host: env.SMTP_HOST || "smtp-relay.brevo.com",
  port: Number(env.SMTP_PORT ?? "587"),
  secure: false,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

try {
  const info = await transport.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject: "InkFlow AI — password reset test",
    text: "If you receive this, Brevo SMTP works.",
    html: "<p>If you receive this, <strong>Brevo SMTP works</strong>.</p>",
  });
  console.log("OK messageId:", info.messageId);
  console.log("response:", info.response);
} catch (e) {
  console.error("FAIL:", e instanceof Error ? e.message : e);
  if (e && typeof e === "object" && "response" in e) {
    console.error("response:", e.response);
  }
  process.exit(1);
}
