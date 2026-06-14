import { applyWatermark } from "@/lib/watermark";

/** Export a canvas to PNG without mutating the on-screen canvas. */
export function downloadCanvasPng(
  canvas: HTMLCanvasElement,
  filename: string,
  options?: { watermark?: boolean },
): void {
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = canvas.width;
  exportCanvas.height = canvas.height;
  const ctx = exportCanvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(canvas, 0, 0);
  if (options?.watermark) applyWatermark(exportCanvas);

  exportCanvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png");
}
