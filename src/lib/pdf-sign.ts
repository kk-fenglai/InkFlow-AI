import { degrees, PDFDocument } from "pdf-lib";
import { clampSignatureSize } from "@/lib/pdf-coords";

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
  const bytes = input.signaturePngBytes;
  // JPEG uploads are accepted by the picker, so pick the embedder by magic bytes.
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const image = isJpeg
    ? await doc.embedJpg(bytes)
    : await doc.embedPng(bytes);

  // The client places the signature on pdf.js's viewport, which already has the
  // page's /Rotate applied; pdf-lib draws in unrotated user space. Work in that
  // same "view" space here, then map the result back.
  const rotation = ((page.getRotation().angle % 360) + 360) % 360;
  const mediaWidth = page.getWidth();
  const mediaHeight = page.getHeight();
  const quarterTurned = rotation === 90 || rotation === 270;
  const viewWidth = quarterTurned ? mediaHeight : mediaWidth;
  const viewHeight = quarterTurned ? mediaWidth : mediaHeight;

  // Clamp against the page the user actually saw, instead of a fixed 400x200
  // box that would silently shrink what they positioned.
  const box = clampSignatureSize(
    input.width,
    input.height,
    viewWidth,
    viewHeight,
  );

  // The placement overlay previews the image with object-contain, so letterbox
  // it inside the box here too rather than stretching it to fill.
  const fit = Math.min(box.width / image.width, box.height / image.height);
  const width = image.width * fit;
  const height = image.height * fit;
  const viewX = input.x + (box.width - width) / 2;
  const viewY = input.y + (box.height - height) / 2;

  // Anchor is the view-space bottom-left corner mapped into user space; the
  // rotation keeps the signature upright in the orientation the reader sees.
  let x = viewX;
  let y = viewY;
  if (rotation === 90) {
    x = mediaWidth - viewY;
    y = viewX;
  } else if (rotation === 180) {
    x = mediaWidth - viewX;
    y = mediaHeight - viewY;
  } else if (rotation === 270) {
    x = viewY;
    y = mediaHeight - viewX;
  }

  page.drawImage(image, {
    x,
    y,
    width,
    height,
    rotate: degrees(rotation),
  });

  doc.setTitle(doc.getTitle() || "Signed document");
  doc.setProducer("InkFlow AI (SES)");
  doc.setModificationDate(new Date());

  return { bytes: await doc.save(), pageCount: pages.length };
}
