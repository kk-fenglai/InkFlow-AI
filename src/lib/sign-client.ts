import { renderSignature, type SignatureSettings } from "@/lib/signature";

/** Render signature settings to a transparent PNG data URL (client only). */
export async function settingsToPngDataUrl(
  settings: SignatureSettings,
  width = 600,
  height = 240,
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  renderSignature(canvas, settings, undefined, { width, height });
  if (typeof document !== "undefined" && "fonts" in document) {
    await document.fonts.ready.catch(() => {});
    renderSignature(canvas, settings, undefined, { width, height });
  }
  return canvas.toDataURL("image/png");
}

export function dataUrlToBase64(dataUrl: string): string {
  return dataUrl.includes(",") ? dataUrl.split(",")[1]! : dataUrl;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(dataUrlToBase64(result));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function triggerDownloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function base64ToBlob(base64: string, mime: string): Blob {
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
