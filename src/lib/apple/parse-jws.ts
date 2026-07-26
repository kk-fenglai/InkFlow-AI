import { decodeProtectedHeader, importX509, jwtVerify } from "jose";

export type AppleJwsPayload = Record<string, unknown>;

/**
 * Verify and decode any Apple App Store JWS (transaction, renewal, notification).
 * When APPLE_IAP_SKIP_VERIFY=true (dev only), parses payload without crypto.
 */
export async function parseAppleJws(
  jws: string,
): Promise<AppleJwsPayload | { error: string }> {
  const skipVerify = process.env.APPLE_IAP_SKIP_VERIFY === "true";

  try {
    if (skipVerify && process.env.NODE_ENV !== "production") {
      const parts = jws.split(".");
      if (parts.length < 2) return { error: "invalid_jws" };
      return JSON.parse(
        Buffer.from(parts[1], "base64url").toString("utf8"),
      ) as AppleJwsPayload;
    }

    const header = decodeProtectedHeader(jws);
    const x5c = header.x5c;
    if (!x5c?.[0]) return { error: "missing_x5c" };

    const cert = `-----BEGIN CERTIFICATE-----\n${x5c[0]}\n-----END CERTIFICATE-----`;
    const key = await importX509(cert, header.alg ?? "ES256");
    const { payload } = await jwtVerify(jws, key);
    return payload as AppleJwsPayload;
  } catch {
    return { error: "verify_failed" };
  }
}

export function readAppleString(
  payload: AppleJwsPayload,
  key: string,
): string | undefined {
  const value = payload[key];
  if (value == null) return undefined;
  const text = String(value).trim();
  return text || undefined;
}
