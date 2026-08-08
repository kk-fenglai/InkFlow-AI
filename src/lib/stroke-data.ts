import { getBase, type SignatureSettings } from "@/lib/signature";

export interface StrokePoint {
  x: number;
  y: number;
}

export interface SignatureStroke {
  id: string;
  order: number;
  label: string;
  points: StrokePoint[];
}

export interface SignatureStrokeData {
  version: 1;
  width: number;
  height: number;
  text: string;
  baseId: string;
  strokes: SignatureStroke[];
  settings: SignatureSettings;
  createdAt: string;
  /** "captured" entries hold a photographed signature instead of vector strokes. */
  kind?: "vector" | "captured";
  /** Transparent PNG data URL for captured signatures (extracted from a photo). */
  capturedImage?: string | null;
}

/**
 * Wrap an extracted (photographed) signature as stroke data so it can live in
 * the same cloud-library column as vector signatures. No real strokes — the
 * transparent PNG is carried in `capturedImage` and rendered directly.
 */
export function buildCapturedStrokeData(
  capturedImage: string,
  name: string,
  width: number,
  height: number,
): SignatureStrokeData {
  const text = name.trim().slice(0, 60) || "Handwritten signature";
  return {
    version: 1,
    width,
    height,
    text,
    baseId: "captured",
    kind: "captured",
    capturedImage,
    strokes: [],
    settings: {
      text,
      baseId: "captured" as SignatureSettings["baseId"],
      fluidity: 0,
      rhythm: 0,
      pressure: 0,
      slant: 0,
      size: 1,
      inkColor: "#1d1c16",
    },
    createdAt: new Date().toISOString(),
  };
}

interface CharLayout {
  char: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  index: number;
}

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mirror renderSignature layout without drawing — produces teachable stroke paths. */
export function generateStrokeData(
  settings: SignatureSettings,
  width = 600,
  height = 240,
): SignatureStrokeData {
  const base = getBase(settings.baseId);
  const text = settings.text.trim() || "Your Name";
  const chars = Array.from(text);
  const rng = mulberry32(hashSeed(text + settings.baseId));

  let fontSize =
    Math.min(height * 0.55, 120) * base.defaults.size * settings.size;
  let letterSpacing = 6 - (settings.fluidity / 100) * 10;
  const jitterAmount = (1 - settings.rhythm / 100) * (fontSize * 0.12);
  const rotJitter = (1 - settings.rhythm / 100) * 0.14;

  const hasSweep = base.flourish === "sweep";
  let charWidth = fontSize * 0.55;
  let totalWidth = chars.length * (charWidth + letterSpacing) - letterSpacing;
  const maxWidth = width * (hasSweep ? 0.78 : 0.86);
  if (totalWidth > maxWidth && totalWidth > 0) {
    const scale = maxWidth / totalWidth;
    fontSize *= scale;
    totalWidth *= scale;
    // The per-character advance has to shrink with totalWidth, or long names
    // start centred and then run off the right edge of the canvas.
    charWidth *= scale;
    letterSpacing *= scale;
  }

  const startX = (width - totalWidth) / 2;
  const baselineY = height / 2 + fontSize * 0.28;
  const spacing = letterSpacing * (fontSize / (fontSize || 1));

  const layouts: CharLayout[] = [];
  let cursorX = startX;

  chars.forEach((ch, i) => {
    const w = ch === " " ? fontSize * 0.35 : charWidth;
    const dy = (rng() - 0.5) * 2 * jitterAmount;
    const rot = (rng() - 0.5) * 2 * rotJitter;
    layouts.push({
      char: ch,
      x: cursorX + w / 2,
      y: baselineY + dy,
      w,
      h: fontSize * 0.9,
      rot,
      index: i,
    });
    cursorX += w + spacing;
    if (ch === " ") cursorX += fontSize * 0.08;
  });

  const strokes: SignatureStroke[] = [];
  let order = 0;
  let prevEnd: StrokePoint | null = null;

  layouts.forEach((layout, idx) => {
    if (layout.char === " ") return;

    const isLast = idx === layouts.length - 1 || isLastNonSpace(layouts, idx);
    const cx = layout.x;
    const cy = layout.y;
    const hw = layout.w * 0.45;
    const hh = layout.h * 0.45;

    if (prevEnd && settings.fluidity > 35) {
      strokes.push({
        id: `conn-${idx}`,
        order: order++,
        label: `Connect to “${layout.char}”`,
        points: [
          prevEnd,
          { x: cx - hw * 0.8, y: cy - hh * 0.2 },
          { x: cx - hw * 0.3, y: cy },
        ],
      });
    }

    const body = charStrokePath(layout.char, cx, cy, hw, hh, layout.rot);
    strokes.push({
      id: `body-${idx}`,
      order: order++,
      label: `Letter “${layout.char}”`,
      points: body,
    });

    prevEnd = body[body.length - 1];

    if (isLast && hasSweep) {
      const sweep = sweepPath(
        prevEnd,
        startX,
        baselineY,
        fontSize,
        width,
        height,
      );
      strokes.push({
        id: "sweep",
        order: order++,
        label: "Underline sweep",
        points: sweep,
      });
      prevEnd = sweep[sweep.length - 1];
    } else if (isLast && settings.fluidity > 50) {
      const flourish = flourishPath(prevEnd, width, height, settings);
      strokes.push({
        id: `flourish-${idx}`,
        order: order++,
        label: "Final flourish",
        points: flourish,
      });
      prevEnd = flourish[flourish.length - 1];
    }
  });

  return {
    version: 1,
    width,
    height,
    text,
    baseId: settings.baseId,
    strokes,
    settings: { ...settings },
    createdAt: new Date().toISOString(),
  };
}

function isLastNonSpace(layouts: CharLayout[], idx: number): boolean {
  for (let i = idx + 1; i < layouts.length; i++) {
    if (layouts[i].char !== " ") return false;
  }
  return true;
}

function charStrokePath(
  ch: string,
  cx: number,
  cy: number,
  hw: number,
  hh: number,
  rot: number,
): StrokePoint[] {
  const upper = ch.toUpperCase();
  const pts: StrokePoint[] = [];

  if (/[A-Z]/.test(upper)) {
    pts.push(
      { x: cx - hw, y: cy + hh * 0.3 },
      { x: cx - hw * 0.2, y: cy - hh },
      { x: cx + hw * 0.5, y: cy - hh * 0.5 },
      { x: cx + hw, y: cy + hh * 0.4 },
    );
    if ("BDRP".includes(upper)) {
      pts.push({ x: cx, y: cy - hh * 0.1 }, { x: cx + hw * 0.6, y: cy + hh * 0.5 });
    }
  } else if (/[0-9]/.test(ch)) {
    pts.push(
      { x: cx - hw * 0.5, y: cy - hh * 0.6 },
      { x: cx + hw * 0.5, y: cy - hh * 0.6 },
      { x: cx + hw * 0.5, y: cy + hh * 0.6 },
      { x: cx - hw * 0.5, y: cy + hh * 0.6 },
    );
  } else {
    pts.push(
      { x: cx - hw, y: cy },
      { x: cx - hw * 0.3, y: cy - hh * 0.6 },
      { x: cx + hw * 0.4, y: cy + hh * 0.5 },
      { x: cx + hw, y: cy - hh * 0.2 },
    );
  }

  return rotatePoints(pts, cx, cy, rot);
}

/** Underline sweep for `flourish: "sweep"` bases — mirrors the canvas bezier. */
function sweepPath(
  start: StrokePoint,
  startX: number,
  baselineY: number,
  fontSize: number,
  width: number,
  height: number,
): StrokePoint[] {
  const exitY = baselineY - fontSize * 0.1;
  const rightX = Math.min(start.x + fontSize * 0.55, width - 6);
  const leftX = Math.max(startX - fontSize * 0.3, 6);
  const underY = Math.min(baselineY + fontSize * 0.3, height - 6);

  const p0 = { x: start.x, y: exitY };
  const c1 = { x: rightX + fontSize * 0.15, y: exitY + fontSize * 0.3 };
  const c2 = { x: (leftX + rightX) / 2, y: underY + fontSize * 0.12 };
  const p3 = { x: leftX, y: baselineY + fontSize * 0.05 };

  const pts: StrokePoint[] = [start];
  for (let i = 1; i <= 12; i++) {
    const t = i / 12;
    const u = 1 - t;
    pts.push({
      x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y,
    });
  }
  return pts;
}

function flourishPath(
  start: StrokePoint,
  width: number,
  _height: number,
  settings: SignatureSettings,
): StrokePoint[] {
  const ext = (settings.fluidity / 100) * width * 0.12;
  return [
    start,
    { x: start.x + ext * 0.4, y: start.y + ext * 0.15 },
    { x: start.x + ext, y: start.y - ext * 0.1 },
    { x: start.x + ext * 1.3, y: start.y + ext * 0.05 },
  ];
}

function rotatePoints(
  pts: StrokePoint[],
  cx: number,
  cy: number,
  rot: number,
): StrokePoint[] {
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  return pts.map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
  });
}

/** Resample stroke to fixed point count for animation. */
export function resampleStroke(
  points: StrokePoint[],
  samples = 60,
): StrokePoint[] {
  if (points.length < 2) return points;

  const lengths: number[] = [0];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y,
    );
    lengths.push(total);
  }
  if (total === 0) return [points[0]];

  const out: StrokePoint[] = [];
  for (let s = 0; s <= samples; s++) {
    const target = (s / samples) * total;
    let seg = 0;
    while (seg < lengths.length - 2 && lengths[seg + 1] < target) seg++;
    const segLen = lengths[seg + 1] - lengths[seg];
    const t = segLen > 0 ? (target - lengths[seg]) / segLen : 0;
    const a = points[seg];
    const b = points[seg + 1];
    out.push({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    });
  }
  return out;
}

/** Compare user trace to target stroke — returns 0..100 accuracy. */
export function scoreTrace(
  user: StrokePoint[],
  target: StrokePoint[],
  tolerance: number,
): number {
  if (user.length < 3 || target.length < 3) return 0;
  const guide = resampleStroke(target, 80);
  const tol = tolerance;
  let near = 0;
  for (const p of user) {
    let best = Infinity;
    for (const g of guide) {
      best = Math.min(best, Math.hypot(p.x - g.x, p.y - g.y));
    }
    if (best <= tol) near++;
  }
  return Math.round((near / user.length) * 100);
}
