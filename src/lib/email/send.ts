/**
 * Transactional email via Brevo SMTP (https://www.brevo.com).
 * SMTP & API → SMTP keys in the Brevo dashboard.
 */
import nodemailer from "nodemailer";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

function smtpConfig() {
  const host = process.env.SMTP_HOST?.trim() || "smtp-relay.brevo.com";
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!user || !pass || !from) {
    return null;
  }

  return { host, port, user, pass, from };
}

export async function sendEmail(
  input: SendEmailInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cfg = smtpConfig();
  if (!cfg) {
    return { ok: false, error: "SMTP_USER, SMTP_PASS, or EMAIL_FROM not configured" };
  }

  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
  });

  try {
    await transport.sendMail({
      from: cfg.from,
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
