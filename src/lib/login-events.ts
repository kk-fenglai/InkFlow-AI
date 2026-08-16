import { prisma } from "@/lib/prisma";

/**
 * Records a successful sign-in. Best-effort: recording must never block or fail
 * a login, so any error (including the table not yet existing) is swallowed.
 */
export async function recordLoginEvent(
  userId: string,
  opts: { source?: string; ip?: string | null; userAgent?: string | null },
): Promise<void> {
  try {
    await prisma.loginEvent.create({
      data: {
        userId,
        source: opts.source ?? "web",
        // Trim to keep obviously-hostile header values from bloating the row.
        ip: opts.ip?.slice(0, 100) ?? null,
        userAgent: opts.userAgent?.slice(0, 400) ?? null,
      },
    });
  } catch {
    // Intentionally ignored — login recording is non-critical.
  }
}

/** First hop of an X-Forwarded-For chain, which is the original client IP. */
export function clientIpFromForwardedFor(
  forwardedFor: string | null | undefined,
): string | null {
  if (!forwardedFor) return null;
  return forwardedFor.split(",")[0]?.trim() || null;
}
