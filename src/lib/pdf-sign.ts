import { PDFDocument } from "pdf-lib";

export interface SignPdfInput {
  pdfBytes: Uint8Array;
  signaturePngBytes: Uint8Array;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  signerName: string;
}

export async function embedSignatureOnPdf(
  input: SignPdfInput,
): Promise<{ bytes: Uint8Array; pageCount: number }> {
  const doc = await PDFDocument.load(input.pdfBytes, { ignoreEncryption: true });
  const pages = doc.getPages();

  if (input.pageIndex < 0 || input.pageIndex >= pages.length) {
    throw new Error("Invalid page index.");
  }

  const page = pages[input.pageIndex];
  const png = await doc.embedPng(input.signaturePngBytes);

  page.drawImage(png, {
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
  });

  doc.setTitle(doc.getTitle() || "Signed document");
  doc.setProducer("InkFlow AI (SES)");
  doc.setModificationDate(new Date());

  return { bytes: await doc.save(), pageCount: pages.length };
}
