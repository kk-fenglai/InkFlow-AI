import { handleAppleServerNotification } from "@/lib/apple/handle-notification";
import {
  jsonWithMobileCors,
  mobileOptionsResponse,
} from "@/lib/mobile-auth/cors";

/**
 * App Store Server Notifications V2.
 * Configure in App Store Connect → App → App Information →
 * App Store Server Notifications → Production / Sandbox URL:
 * https://signaturegeneratorai.vercel.app/api/apple/webhook
 */
export async function OPTIONS(req: Request) {
  return mobileOptionsResponse(req);
}

export async function POST(req: Request) {
  let body: { signedPayload?: string };
  try {
    body = await req.json();
  } catch {
    return jsonWithMobileCors(
      req,
      { error: "Invalid JSON", code: "INVALID_JSON" },
      { status: 400 },
    );
  }

  const signedPayload = body.signedPayload?.trim();
  if (!signedPayload) {
    return jsonWithMobileCors(
      req,
      { error: "signedPayload required.", code: "VALIDATION" },
      { status: 400 },
    );
  }

  const result = await handleAppleServerNotification(signedPayload);
  if (!result.ok) {
    console.error("[apple/webhook] verify failed", result.error);
    return jsonWithMobileCors(
      req,
      { error: "Verification failed.", code: result.error },
      { status: 400 },
    );
  }

  return jsonWithMobileCors(req, { ok: true, handled: result.handled });
}
