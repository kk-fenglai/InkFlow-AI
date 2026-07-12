import {
  jsonWithMobileCors,
  mobileOptionsResponse,
} from "@/lib/mobile-auth/cors";

/**
 * App Store Server Notifications V2 endpoint.
 * Configure URL in App Store Connect → App → App Information → App Store Server Notifications.
 *
 * Full JWS verification and renewal handling to be extended in phase 2c.
 */
export async function OPTIONS(req: Request) {
  return mobileOptionsResponse(req);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonWithMobileCors(
      req,
      { error: "Invalid JSON", code: "INVALID_JSON" },
      { status: 400 },
    );
  }

  console.info("[apple/webhook] notification received", {
    hasSignedPayload: Boolean(
      body &&
        typeof body === "object" &&
        "signedPayload" in body &&
        (body as { signedPayload?: string }).signedPayload,
    ),
  });

  // Apple expects 200 to acknowledge receipt; process async in future iteration.
  return jsonWithMobileCors(req, { ok: true });
}
