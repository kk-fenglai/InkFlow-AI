import {
  resampleStroke,
  type SignatureStroke,
  type StrokePoint,
} from "@/lib/stroke-data";
import type { InkLessonAssets } from "@/lib/ink-stroke-paths";

export interface StrokeTransform {
  scale: number;
  ox: number;
  oy: number;
  w: number;
  h: number;
}

export function computeStrokeTransform(
  viewportW: number,
  viewportH: number,
  sourceW: number,
  sourceH: number,
  padding = 0.04,
): StrokeTransform {
  const padX = viewportW * padding;
  const padY = viewportH * padding;
  const innerW = viewportW - padX * 2;
  const innerH = viewportH - padY * 2;
  const sx = innerW / sourceW;
  const sy = innerH / sourceH;
  const scale = Math.min(sx, sy);
  const ox = (viewportW - sourceW * scale) / 2;
  const oy = (viewportH - sourceH * scale) / 2;
  return { scale, ox, oy, w: viewportW, h: viewportH };
}

export function mapStrokePoint(
  point: StrokePoint,
  transform: StrokeTransform,
): StrokePoint {
  return {
    x: transform.ox + point.x * transform.scale,
    y: transform.oy + point.y * transform.scale,
  };
}

export function drawPath(
  ctx: CanvasRenderingContext2D,
  points: StrokePoint[],
  mapPt: (p: StrokePoint) => StrokePoint,
  style: { color: string; width: number; dash?: number[]; alpha?: number },
  partial = 1,
): void {
  if (points.length < 2 || partial <= 0) return;
  const guide = resampleStroke(points, 72).map(mapPt);
  const end = Math.max(2, Math.floor(guide.length * partial));
  ctx.save();
  ctx.globalAlpha = style.alpha ?? 1;
  ctx.strokeStyle = style.color;
  ctx.lineWidth = style.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (style.dash) ctx.setLineDash(style.dash);
  ctx.beginPath();
  guide.slice(0, end).forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
  ctx.restore();
}

/** Video frame: ghost signature + animated pen ink along skeleton paths. */
export function drawInkVideoFrame(
  ctx: CanvasRenderingContext2D,
  viewportW: number,
  viewportH: number,
  assets: InkLessonAssets,
  sourceW: number,
  sourceH: number,
  progress: number,
): StrokePoint | null {
  ctx.clearRect(0, 0, viewportW, viewportH);
  ctx.fillStyle = "#fdfbf7";
  ctx.fillRect(0, 0, viewportW, viewportH);

  const transform = computeStrokeTransform(viewportW, viewportH, sourceW, sourceH);
  const mapPt = (p: StrokePoint) => mapStrokePoint(p, transform);

  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.drawImage(
    assets.ghostCanvas,
    transform.ox,
    transform.oy,
    sourceW * transform.scale,
    sourceH * transform.scale,
  );
  ctx.restore();

  const segments = assets.strokes.map((s) => resampleStroke(s.points, 56));
  const totalLen = segments.reduce((sum, seg) => sum + seg.length, 0) || 1;
  let remaining = Math.max(0, Math.min(1, progress)) * totalLen;
  let pen: StrokePoint | null = null;

  for (const segment of segments) {
    if (remaining <= 0) break;
    const used = Math.min(segment.length, remaining);
    const partial = used / segment.length;
    drawPath(ctx, segment, mapPt, {
      color: assets.inkColor,
      width: assets.lineWidth * transform.scale,
    }, partial);
    const guide = segment.map(mapPt);
    const tip = guide[Math.max(0, Math.floor(guide.length * partial) - 1)];
    pen = tip ?? pen;
    remaining -= segment.length;
  }

  if (pen) {
    ctx.save();
    ctx.fillStyle = assets.inkColor;
    ctx.beginPath();
    ctx.arc(pen.x, pen.y, assets.lineWidth * transform.scale * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  return pen;
}

/** Practice canvas: ghost font + stroke guides + user ink. */
export function drawInkPracticeFrame(
  ctx: CanvasRenderingContext2D,
  viewportW: number,
  viewportH: number,
  assets: InkLessonAssets,
  sourceW: number,
  sourceH: number,
  strokeIndex: number,
  animProgress: number,
  userStrokes: StrokePoint[][],
): void {
  ctx.clearRect(0, 0, viewportW, viewportH);
  ctx.fillStyle = "#fdfbf7";
  ctx.fillRect(0, 0, viewportW, viewportH);

  const transform = computeStrokeTransform(viewportW, viewportH, sourceW, sourceH);
  const mapPt = (p: StrokePoint) => mapStrokePoint(p, transform);

  ctx.save();
  ctx.globalAlpha = 0.34;
  ctx.drawImage(
    assets.ghostCanvas,
    transform.ox,
    transform.oy,
    sourceW * transform.scale,
    sourceH * transform.scale,
  );
  ctx.restore();

  assets.strokes.forEach((stroke, idx) => {
    const isCurrent = idx === strokeIndex;
    const isPast = idx < strokeIndex;
    drawPath(ctx, stroke.points, mapPt, {
      color: isPast
        ? "rgba(29, 28, 22, 0.45)"
        : isCurrent
          ? "rgba(119, 90, 25, 0.55)"
          : "rgba(119, 90, 25, 0.22)",
      width: (isCurrent ? 3 : 2) * transform.scale,
      dash: isCurrent ? [5, 7] : undefined,
    });
  });

  const current = assets.strokes[strokeIndex];
  if (current && animProgress > 0) {
    drawPath(ctx, current.points, mapPt, {
      color: assets.inkColor,
      width: assets.lineWidth * transform.scale,
    }, animProgress);
  }

  ctx.strokeStyle = "#1d1c16";
  ctx.lineWidth = 3.5 * transform.scale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  userStrokes.forEach((stroke) => {
    if (stroke.length < 2) return;
    ctx.beginPath();
    stroke.map(mapPt).forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  });
}

export function inkTargetStroke(
  assets: InkLessonAssets,
  strokeIndex: number,
): SignatureStroke | undefined {
  return assets.strokes[strokeIndex];
}
