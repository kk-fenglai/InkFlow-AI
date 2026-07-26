import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { rateLimit } from "@/lib/rate-limit";
import { getSessionUser } from "@/lib/session";
import {
  createSignedDocument,
  listSignedDocuments,
  MAX_DOCUMENT_BYTES,
  MAX_DOCUMENTS_PER_USER,
} from "@/lib/signed-documents";

function decodeBase64(data: string): Uint8Array {
  const raw = data.includes(",") ? data.split(",")[1]! : data;
  return Uint8Array.from(Buffer.from(raw, "base64"));
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to view your documents.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const documents = await listSignedDocuments(user.id);
  return NextResponse.json({ ok: true, documents, max: MAX_DOCUMENTS_PER_USER });
}

/** Stores an already-signed PDF in the cloud library. Free — signing was billed. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to save documents.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const rl = rateLimit(`documents:upload:${user.id}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: "Too many uploads. Try again shortly.",
        code: "RATE_LIMITED",
        retryAfterSec: rl.retryAfterSec,
      },
      { status: 429 },
    );
  }

  let body: { pdfBase64?: string; fileName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const pdfBase64 = String(body.pdfBase64 ?? "");
  if (!pdfBase64) {
    return NextResponse.json({ error: "PDF is required." }, { status: 400 });
  }

  let bytes: Uint8Array;
  try {
    bytes = decodeBase64(pdfBase64);
  } catch {
    return NextResponse.json({ error: "Invalid base64 payload." }, { status: 400 });
  }

  if (bytes.byteLength > MAX_DOCUMENT_BYTES) {
    return NextResponse.json(
      {
        error: `Documents in the cloud library are limited to ${Math.round(
          MAX_DOCUMENT_BYTES / (1024 * 1024),
        )} MB. Download this one instead.`,
        code: "DOCUMENT_TOO_LARGE",
      },
      { status: 413 },
    );
  }

  let pageCount = 1;
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    pageCount = doc.getPageCount();
  } catch {
    return NextResponse.json({ error: "Not a readable PDF." }, { status: 400 });
  }

  const fileName =
    String(body.fileName ?? "signed.pdf").trim().slice(0, 120) || "signed.pdf";

  try {
    const document = await createSignedDocument(
      user.id,
      fileName,
      bytes,
      pageCount,
    );
    return NextResponse.json({ ok: true, document });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
