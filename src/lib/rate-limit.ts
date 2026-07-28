const buckets = new Map<string, { count: number; resetAt: number }>();
const MAX_BUCKETS = 10_000;

/** Lightweight in-memory rate limit (per user or IP). Resets on cold start. */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const entry = buckets.get(key);

  // Keys that are never revisited would otherwise live for the life of the
  // process; sweep expired ones once the map grows past a sane size.
  if (buckets.size > MAX_BUCKETS) {
    for (const [k, v] of buckets) {
      if (now > v.resetAt) buckets.delete(k);
    }
  }

  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (entry.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  return { ok: true };
}

export function creditActionKey(userId: string, action: string): string {
  return `credit:${userId}:${action}`;
}

/** Best-effort client IP behind Vercel/proxies; "unknown" groups direct hits. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** Per-IP rate limit for unauthenticated auth endpoints. */
export function authRateLimit(
  req: Request,
  action: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSec: number } {
  return rateLimit(`auth:${action}:${clientIp(req)}`, limit, windowMs);
}
