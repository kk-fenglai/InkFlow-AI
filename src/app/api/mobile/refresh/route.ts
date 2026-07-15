import { buildMobileAuthResponse } from "@/lib/mobile-auth/response";
import { rotateRefreshToken, signAccessToken } from "@/lib/mobile-auth/tokens";
import { loadUserAuthPayload } from "@/lib/session";
import { sessionUserFromDb } from "@/lib/auth/session-user";
import {
  jsonWithMobileCors,
  mobileOptionsResponse,
} from "@/lib/mobile-auth/cors";
import { authRateLimit } from "@/lib/rate-limit";

export async function OPTIONS(req: Request) {
  return mobileOptionsResponse(req);
}

export async function POST(req: Request) {
  const rl = authRateLimit(req, "mobile-refresh", 30, 60_000);
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

  let body: { refreshToken?: string };
  try {
    body = await req.json();
  } catch {
    return jsonWithMobileCors(
      req,
      { error: "Invalid JSON", code: "INVALID_JSON" },
      { status: 400 },
    );
  }

  const refreshToken = body.refreshToken?.trim();
  if (!refreshToken) {
    return jsonWithMobileCors(
      req,
      { error: "refreshToken required.", code: "VALIDATION" },
      { status: 400 },
    );
  }

  const rotated = await rotateRefreshToken(refreshToken);
  if (!rotated) {
    return jsonWithMobileCors(
      req,
      { error: "Invalid or expired refresh token.", code: "INVALID_REFRESH" },
      { status: 401 },
    );
  }

  const user = await loadUserAuthPayload(rotated.userId);
  if (!user) {
    return jsonWithMobileCors(
      req,
      { error: "User not found.", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  const accessToken = await signAccessToken(user.id);
  const sessionUser = sessionUserFromDb(user);

  return jsonWithMobileCors(req, {
    ok: true,
    accessToken,
    refreshToken: rotated.refreshToken,
    expiresIn: 60 * 15,
    user: {
      id: sessionUser.id,
      email: sessionUser.email,
      name: sessionUser.name,
      credits: sessionUser.credits,
      plan: sessionUser.plan,
      role: sessionUser.role,
    },
  });
}
