export interface CloudDocument {
  id: string;
  fileName: string;
  pageCount: number;
  byteSize: number;
  savedAt: string;
}

export interface CloudDocumentWithData extends CloudDocument {
  pdfBase64: string;
}

export async function fetchCloudDocuments(): Promise<{
  ok: boolean;
  documents: CloudDocument[];
  error?: string;
  code?: string;
}> {
  const res = await fetch("/api/documents");
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, documents: [], error: data.error, code: data.code };
  }
  return { ok: true, documents: data.documents ?? [] };
}

export async function uploadCloudDocument(input: {
  pdfBase64: string;
  fileName: string;
}): Promise<{
  ok: boolean;
  document?: CloudDocument;
  error?: string;
  code?: string;
}> {
  const res = await fetch("/api/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) {
    return {
      ok: false,
      error: data.error,
      code: data.code ?? (res.status === 401 ? "UNAUTHORIZED" : undefined),
    };
  }
  return { ok: true, document: data.document };
}

export async function fetchCloudDocument(id: string): Promise<{
  ok: boolean;
  document?: CloudDocumentWithData;
  error?: string;
}> {
  const res = await fetch(`/api/documents/${id}`);
  const data = await res.json();
  if (!res.ok) return { ok: false, error: data.error };
  return { ok: true, document: data.document };
}

export async function deleteCloudDocument(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
  const data = await res.json();
  if (!res.ok) return { ok: false, error: data.error };
  return { ok: true };
}

export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
