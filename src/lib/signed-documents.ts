import { prisma } from "@/lib/prisma";

/**
 * Signed PDFs are stored as rows in Postgres rather than object storage, so the
 * per-user footprint has to stay bounded: a size cap per file and a rolling
 * window of the newest documents.
 */
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENTS_PER_USER = 20;

export interface SignedDocumentMeta {
  id: string;
  fileName: string;
  pageCount: number;
  byteSize: number;
  savedAt: string;
}

export interface SignedDocumentWithData extends SignedDocumentMeta {
  pdfBase64: string;
}

function toMeta(row: {
  id: string;
  fileName: string;
  pageCount: number;
  byteSize: number;
  createdAt: Date;
}): SignedDocumentMeta {
  return {
    id: row.id,
    fileName: row.fileName,
    pageCount: row.pageCount,
    byteSize: row.byteSize,
    savedAt: row.createdAt.toISOString(),
  };
}

export async function listSignedDocuments(
  userId: string,
): Promise<SignedDocumentMeta[]> {
  const rows = await prisma.signedDocument.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: MAX_DOCUMENTS_PER_USER,
    select: {
      id: true,
      fileName: true,
      pageCount: true,
      byteSize: true,
      createdAt: true,
    },
  });
  return rows.map(toMeta);
}

export async function createSignedDocument(
  userId: string,
  fileName: string,
  bytes: Uint8Array,
  pageCount: number,
): Promise<SignedDocumentMeta> {
  const row = await prisma.signedDocument.create({
    data: {
      userId,
      fileName: fileName.slice(0, 120),
      pageCount: Math.max(1, Math.floor(pageCount)),
      byteSize: bytes.byteLength,
      data: Buffer.from(bytes),
    },
    select: {
      id: true,
      fileName: true,
      pageCount: true,
      byteSize: true,
      createdAt: true,
    },
  });

  await pruneOldDocuments(userId);
  return toMeta(row);
}

/** Drops everything past the newest MAX_DOCUMENTS_PER_USER rows. */
async function pruneOldDocuments(userId: string): Promise<void> {
  const keep = await prisma.signedDocument.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: MAX_DOCUMENTS_PER_USER,
    select: { id: true },
  });
  if (keep.length < MAX_DOCUMENTS_PER_USER) return;

  await prisma.signedDocument.deleteMany({
    where: { userId, id: { notIn: keep.map((r) => r.id) } },
  });
}

export async function getSignedDocument(
  userId: string,
  id: string,
): Promise<SignedDocumentWithData | null> {
  const row = await prisma.signedDocument.findFirst({
    where: { id, userId },
  });
  if (!row) return null;
  return {
    ...toMeta(row),
    pdfBase64: Buffer.from(row.data).toString("base64"),
  };
}

export async function deleteSignedDocument(
  userId: string,
  id: string,
): Promise<boolean> {
  const { count } = await prisma.signedDocument.deleteMany({
    where: { id, userId },
  });
  return count > 0;
}
