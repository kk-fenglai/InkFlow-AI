import {
  jsonWithMobileCors,
  mobileOptionsResponse,
} from "@/lib/mobile-auth/cors";

/**
 * Google Play Real-time Developer Notifications (RTDN) endpoint.
 * Configure Pub/Sub push to this URL when ready.
 * MVP: acknowledge receipt; refund handling can be extended later.
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

  console.info("[google/webhook] notification received", {
    keys:
      body && typeof body === "object" ? Object.keys(body as object) : [],
  });

  return jsonWithMobileCors(req, { ok: true });
}
