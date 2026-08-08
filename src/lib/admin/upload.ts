/**
 * Shared validation for admin image uploads. Same idiom as /api/ai-photo:
 * base64 data URL in the JSON body, png/jpeg/webp only, hard size cap under
 * Vercel's 4.5 MB body limit.
 */

export const MAX_UPLOAD_DATA_URL = 3_500_000;

const DATA_URL_RE = /^data:image\/(png|jpeg|webp);base64,/;

export interface ParsedUpload {
  mimeType: string;
  buffer: Buffer;
  byteSize: number;
}

export function parseImageDataUrl(
  value: unknown,
): { ok: true; upload: ParsedUpload } | { ok: false; status: number; error: string } {
  if (typeof value !== "string" || !DATA_URL_RE.test(value)) {
    return {
      ok: false,
      status: 400,
      error: "image must be a png, jpeg, or webp data URL.",
    };
  }
  if (value.length > MAX_UPLOAD_DATA_URL) {
    return { ok: false, status: 413, error: "Image is too large (max ~2.5 MB)." };
  }
  const comma = value.indexOf(",");
  const mimeType = value.slice(5, value.indexOf(";"));
  const buffer = Buffer.from(value.slice(comma + 1), "base64");
  return { ok: true, upload: { mimeType, buffer, byteSize: buffer.byteLength } };
}
