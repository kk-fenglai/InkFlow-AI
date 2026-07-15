import { authenticateCredentials } from "@/lib/session";
import { normalizeEmail } from "@/lib/auth/password";
import { buildMobileAuthResponse } from "@/lib/mobile-auth/response";
import {
  jsonWithMobileCors,
  mobileOptionsResponse,
} from "@/lib/mobile-auth/cors";
import { authRateLimit } from "@/lib/rate-limit";

export async function OPTIONS(req: Request) {
  return mobileOptionsResponse(req);
}

export async function POST(req: Request) {
  const rl = authRateLimit(req, "mobile-login", 10, 60_000);
  if (!rl.ok) {
    return jsonWithMobileCors(
      req,
      {
        error: "Too many attempts. Try again shortly.",
        code: "RATE_LIMITED",
        retryAfterSec: rl.retryAfterSec,
      },
      { status: 429 },
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return jsonWithMobileCors(
      req,
      { error: "Invalid JSON", code: "INVALID_JSON" },
      { status: 400 },
    );
  }

  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";

  if (!email || !password) {
    return jsonWithMobileCors(
      req,
      { error: "Email and password required.", code: "VALIDATION" },
      { status: 400 },
    );
  }

  const user = await authenticateCredentials(email, password);
  if (!user) {
    return jsonWithMobileCors(
      req,
      { error: "Invalid email or password.", code: "INVALID_CREDENTIALS" },
      { status: 401 },
    );
  }

  return jsonWithMobileCors(req, await buildMobileAuthResponse(user));
}
