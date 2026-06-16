/**
 * Transactional email via Resend (https://resend.com).
 * Set RESEND_API_KEY and EMAIL_FROM in env.
 */

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail(input: SendEmailInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    return { ok: false, error: "RESEND_API_KEY or EMAIL_FROM not configured" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[email] Resend error:", res.status, body);
    return { ok: false, error: `Resend ${res.status}` };
  }

  return { ok: true };
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
