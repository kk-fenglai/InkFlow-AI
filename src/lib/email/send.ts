/**
 * Transactional email via Brevo (https://www.brevo.com).
 * Prefer BREVO_API_KEY (HTTP API). Falls back to SMTP if set.
 */

import nodemailer from "nodemailer";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

function parseFrom(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: "InkFlow AI", email: from.trim() };
}

async function sendViaBrevoApi(
  input: SendEmailInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const fromRaw = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !fromRaw) {
    return { ok: false, error: "BREVO_API_KEY or EMAIL_FROM not configured" };
  }

  const sender = parseFrom(fromRaw);
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender,
      to: [{ email: input.to }],
      subject: input.subject,
      htmlContent: input.html,
      textContent: input.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[email] Brevo API error:", res.status, body);
    return { ok: false, error: `Brevo API ${res.status}: ${body.slice(0, 200)}` };
  }

  return { ok: true };
}

async function sendViaSmtp(
  input: SendEmailInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const host = process.env.SMTP_HOST?.trim() || "smtp-relay.brevo.com";
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!user || !pass || !from) {
    return { ok: false, error: "SMTP_USER, SMTP_PASS, or EMAIL_FROM not configured" };
  }

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  try {
    await transport.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return { ok: true };
  } catch (err) {
    console.error("[email] Brevo SMTP error:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "SMTP send failed",
    };
  }
}

export async function sendEmail(
  input: SendEmailInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (process.env.BREVO_API_KEY?.trim()) {
    const apiResult = await sendViaBrevoApi(input);
    if (apiResult.ok) return apiResult;
    console.warn("[email] Brevo API failed, trying SMTP:", apiResult.error);
  }

  return sendViaSmtp(input);
}

export function passwordResetEmailHtml(resetUrl: string): string {
  return `
    <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h1 style="font-size: 22px; font-weight: normal;">InkFlow AI</h1>
      <p>You requested a password reset. Click the button below — link expires in 1 hour.</p>
      <p style="margin: 28px 0;">
        <a href="${resetUrl}" style="background: #1a1a1a; color: #f5f0e8; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Reset password
        </a>
      </p>
      <p style="font-size: 13px; color: #666;">If you did not request this, ignore this email.</p>
      <p style="font-size: 12px; color: #999; word-break: break-all;">${resetUrl}</p>
    </div>
  `.trim();
}
