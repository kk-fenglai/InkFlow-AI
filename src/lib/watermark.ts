/** Draw a subtle watermark on canvas for free-tier exports. */
export function applyWatermark(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const dpr = w / (canvas.clientWidth || w);
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#775a19";
  ctx.font = `${14 * dpr}px sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText("InkFlow AI · Preview", w - 12 * dpr, h - 12 * dpr);
  ctx.restore();
}
