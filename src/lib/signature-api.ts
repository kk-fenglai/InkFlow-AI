import type { SignatureStrokeData } from "@/lib/stroke-data";
import type { SignatureSettings } from "@/lib/signature";
import type { SavedSignature } from "@/lib/signature-library";

export async function fetchCloudSignatures(): Promise<{
  ok: boolean;
  signatures: SavedSignature[];
  error?: string;
  code?: string;
}> {
  const res = await fetch("/api/signatures");
  const data = await res.json();
  if (!res.ok) {
    return {
      ok: false,
      signatures: [],
      error: data.error,
      code: data.code,
    };
  }
  return { ok: true, signatures: data.signatures ?? [] };
}

export async function saveCloudSignature(input: {
  name?: string;
  strokeData?: SignatureStrokeData;
  settings?: SignatureSettings;
  canvasWidth?: number;
  canvasHeight?: number;
}): Promise<{
  ok: boolean;
  signature?: SavedSignature;
  creditsRemaining?: number;
  error?: string;
  code?: string;
}> {
  const res = await fetch("/api/signatures", {
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
  return {
    ok: true,
    signature: data.signature,
    creditsRemaining: data.creditsRemaining,
  };
}

export async function renameCloudSignature(
  id: string,
  name: string,
): Promise<{ ok: boolean; signature?: SavedSignature; error?: string }> {
  const res = await fetch(`/api/signatures/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, error: data.error };
  return { ok: true, signature: data.signature };
}

export async function deleteCloudSignature(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/signatures/${id}`, { method: "DELETE" });
  const data = await res.json();
  if (!res.ok) return { ok: false, error: data.error };
  return { ok: true };
}
