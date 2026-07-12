import { revokeRefreshToken } from "@/lib/mobile-auth/tokens";
import {
  jsonWithMobileCors,
  mobileOptionsResponse,
} from "@/lib/mobile-auth/cors";

export async function OPTIONS(req: Request) {
  return mobileOptionsResponse(req);
}

export async function POST(req: Request) {
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
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }

  return jsonWithMobileCors(req, { ok: true });
}
