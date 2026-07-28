import { NextResponse } from "next/server";
import { CREDIT_COST } from "@/lib/constants";
import { addCredits } from "@/lib/credits";
import { guardCreditAction } from "@/lib/credit-guard";
import { embedSignatureOnPdf } from "@/lib/pdf-sign";
import { prisma } from "@/lib/prisma";

const MAX_BYTES = 10 * 1024 * 1024;

function decodeBase64(data: string): Uint8Array {
  const raw = data.includes(",") ? data.split(",")[1]! : data;
  return Uint8Array.from(Buffer.from(raw, "base64"));
}

export async function POST(req: Request) {
  const guard = await guardCreditAction(
    CREDIT_COST.SIGN_PDF,
    "sign_pdf_ses",
    "sign_pdf",
    20,
  );
  if (!guard.ok) return guard.response;

  // The credit is taken up front, so every failure past this point must give it back.
  const failAndRefund = async (body: object, status: number) => {
    await addCredits(guard.user.id, CREDIT_COST.SIGN_PDF, "sign_pdf_refund");
    return NextResponse.json(body, { status });
  };

  let body: {
    pdfBase64?: string;
    signaturePngBase64?: string;
    pageIndex?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    fileName?: string;
    sesAccepted?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return failAndRefund({ error: "Invalid JSON" }, 400);
  }

  if (!body.sesAccepted) {
    return failAndRefund(
      { error: "You must accept the SES disclaimer.", code: "SES_REQUIRED" },
      400,
    );
  }

  const pdfBase64 = String(body.pdfBase64 ?? "");
  const signaturePngBase64 = String(body.signaturePngBase64 ?? "");
  if (!pdfBase64 || !signaturePngBase64) {
    return failAndRefund(
      { error: "PDF and signature image are required." },
      400,
    );
  }

  let pdfBytes: Uint8Array;
  let signaturePngBytes: Uint8Array;
  try {
    pdfBytes = decodeBase64(pdfBase64);
    signaturePngBytes = decodeBase64(signaturePngBase64);
  } catch {
    return failAndRefund({ error: "Invalid base64 payload." }, 400);
  }

  if (pdfBytes.byteLength > MAX_BYTES) {
    return failAndRefund({ error: "PDF exceeds 10 MB limit." }, 413);
  }

  const pageIndex = Math.max(0, Math.floor(Number(body.pageIndex ?? 0)));
  const x = Number(body.x ?? 72);
  const y = Number(body.y ?? 72);
  // Page-relative clamping happens in embedSignatureOnPdf, which knows the page size.
  const width = Math.max(24, Number(body.width ?? 160));
  const height = Math.max(12, Number(body.height ?? 60));
  const fileName =
    String(body.fileName ?? "document.pdf").trim().slice(0, 120) || "document.pdf";
  const signerName = guard.user.name ?? guard.user.email ?? "Signer";

  try {
    const { bytes: signed, pageCount } = await embedSignatureOnPdf({
      pdfBytes,
      signaturePngBytes,
      pageIndex,
      x,
      y,
      width,
      height,
      signerName,
    });

    await prisma.signAudit.create({
      data: {
        userId: guard.user.id,
        fileName,
        level: "SES",
        pageCount,
      },
    });

    const pdfBase64Out = Buffer.from(signed).toString("base64");

    return NextResponse.json({
      ok: true,
      pdfBase64: pdfBase64Out,
      fileName: fileName.replace(/\.pdf$/i, "") + "-signed.pdf",
      creditsRemaining: guard.remaining,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not sign PDF.";
    return failAndRefund({ error: message }, 422);
  }
}
