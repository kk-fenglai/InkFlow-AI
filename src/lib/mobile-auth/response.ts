import type { SessionUser } from "@/lib/auth/session-user";
import {
  issueRefreshToken,
  MOBILE_TOKEN_TTL,
  signAccessToken,
} from "@/lib/mobile-auth/tokens";

export async function buildMobileAuthResponse(user: SessionUser) {
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(user.id),
    issueRefreshToken(user.id),
  ]);

  return {
    ok: true as const,
    accessToken,
    refreshToken,
    expiresIn: MOBILE_TOKEN_TTL.accessSeconds,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      credits: user.credits,
      plan: user.plan,
      role: user.role,
    },
  };
}
