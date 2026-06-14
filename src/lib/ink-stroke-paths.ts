import {
  drawGlyph,
  getBase,
  loadBackgroundImage,
  prepareSignatureLayout,
  renderSignature,
  type RenderSize,
  type SignatureSettings,
} from "@/lib/signature";
import {
  resampleStroke,
  type SignatureStroke,
  type SignatureStrokeData,
  type StrokePoint,
} from "@/lib/stroke-data";

export interface InkLessonAssets {
  strokes: SignatureStroke[];
  ghostCanvas: HTMLCanvasElement;
  inkColor: string;
  lineWidth: number;
}

const cache = new Map<string, InkLessonAssets>();
const EXTRACT_SCALE = 2;

function cacheKey(
  settings: SignatureSettings,
  width: number,
  height: number,
): string {
  return JSON.stringify({ settings, width, height });
}

function idx(w: number, x: number, y: number): number {
  return y * w + x;
}

function neighbors8(): [number, number][] {
  return [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ];
}

function countMask(mask: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < mask.length; i++) if (mask[i]) n++;
  return n;
}

async function ensureSignatureFonts(settings: SignatureSettings): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  const base = getBase(settings.baseId);
  try {
    await document.fonts.load(`48px ${base.fontFamily}`);
  } catch {
    /* fallback family may still paint */
  }
  await document.fonts.ready.catch(() => {});
}

function renderOffscreen(
  settings: SignatureSettings,
  width: number,
  height: number,
  bgImage: HTMLImageElement | null,
  withBackground: boolean,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const size: RenderSize = { width, height };
  const inkSettings = withBackground
    ? settings
    : { ...settings, backgroundImage: null };
  renderSignature(canvas, inkSettings, withBackground ? bgImage : null, size);
  return canvas;
}

/** Zhang–Suen thinning on a binary mask. */
function thinMask(mask: Uint8Array, w: number, h: number): Uint8Array {
  const src = mask.slice();
  const nbrs = neighbors8();
  let changed = true;

  const countNeighbors = (x: number, y: number): number => {
    let c = 0;
    for (const [dx, dy] of nbrs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < w && ny >= 0 && ny < h && src[idx(w, nx, ny)]) c++;
    }
    return c;
  };

  const countTransitions = (x: number, y: number): number => {
    const p = [
      src[idx(w, x, y - 1)],
      src[idx(w, x + 1, y - 1)],
      src[idx(w, x + 1, y)],
      src[idx(w, x + 1, y + 1)],
      src[idx(w, x, y + 1)],
      src[idx(w, x - 1, y + 1)],
      src[idx(w, x - 1, y)],
      src[idx(w, x - 1, y - 1)],
    ];
    let t = 0;
    for (let i = 0; i < 8; i++) {
      if (!p[i] && p[(i + 1) % 8]) t++;
    }
    return t;
  };

  while (changed) {
    changed = false;
    const toClear: number[] = [];

    for (let pass = 0; pass < 2; pass++) {
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = idx(w, x, y);
          if (!src[i]) continue;
          const n = countNeighbors(x, y);
          if (n < 2 || n > 6) continue;
          if (countTransitions(x, y) !== 1) continue;

          if (pass === 0) {
            if (
              src[idx(w, x, y - 1)] &&
              src[idx(w, x, y + 1)] &&
              src[idx(w, x - 1, y)] &&
              src[idx(w, x + 1, y)]
            ) {
              continue;
            }
          } else if (
            src[idx(w, x - 1, y)] &&
            src[idx(w, x + 1, y)] &&
            src[idx(w, x, y - 1)] &&
            src[idx(w, x, y + 1)]
          ) {
            continue;
          }
          toClear.push(i);
        }
      }

      if (toClear.length) {
        changed = true;
        toClear.forEach((i) => {
          src[i] = 0;
        });
      }
    }
  }

  return src;
}

function simplifyPolyline(points: StrokePoint[], tolerance: number): StrokePoint[] {
  if (points.length <= 2) return points;

  const sqTol = tolerance * tolerance;
  const distSq = (p: StrokePoint, a: StrokePoint, b: StrokePoint) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 0 && dy === 0) {
      const ex = p.x - a.x;
      const ey = p.y - a.y;
      return ex * ex + ey * ey;
    }
    const t = Math.max(
      0,
      Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)),
    );
    const px = a.x + t * dx;
    const py = a.y + t * dy;
    const ex = p.x - px;
    const ey = p.y - py;
    return ex * ex + ey * ey;
  };

  const rdp = (pts: StrokePoint[], start: number, end: number, out: StrokePoint[]) => {
    let maxDist = 0;
    let index = 0;
    for (let i = start + 1; i < end; i++) {
      const d = distSq(pts[i], pts[start], pts[end]);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }
    if (maxDist > sqTol) {
      rdp(pts, start, index, out);
      rdp(pts, index, end, out);
    } else {
      out.push(pts[start]);
      if (end !== start) out.push(pts[end]);
    }
  };

  const out: StrokePoint[] = [];
  rdp(points, 0, points.length - 1, out);
  return out;
}

function traceSkeletonPaths(
  skeleton: Uint8Array,
  w: number,
  h: number,
  minLen = 3,
): StrokePoint[][] {
  const nbrs = neighbors8();
  const visited = new Uint8Array(w * h);
  const degree = (x: number, y: number): number => {
    let d = 0;
    for (const [dx, dy] of nbrs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < w && ny >= 0 && ny < h && skeleton[idx(w, nx, ny)]) d++;
    }
    return d;
  };

  const walk = (startX: number, startY: number): StrokePoint[] => {
    const path: StrokePoint[] = [{ x: startX, y: startY }];
    visited[idx(w, startX, startY)] = 1;
    let cx = startX;
    let cy = startY;
    let prevX = startX;
    let prevY = startY;

    while (true) {
      let best: StrokePoint | null = null;
      let bestScore = -Infinity;

      for (const [dx, dy] of nbrs) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        if (!skeleton[idx(w, nx, ny)] || visited[idx(w, nx, ny)]) continue;

        const vx = cx - prevX;
        const vy = cy - prevY;
        const wx = nx - cx;
        const wy = ny - cy;
        const score = vx * wx + vy * wy - nx * 0.001;
        if (score > bestScore) {
          bestScore = score;
          best = { x: nx, y: ny };
        }
      }

      if (!best) break;
      path.push(best);
      visited[idx(w, best.x, best.y)] = 1;
      prevX = cx;
      prevY = cy;
      cx = best.x;
      cy = best.y;

      if (degree(cx, cy) !== 2) break;
    }

    return path;
  };

  const endpoints: StrokePoint[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (skeleton[idx(w, x, y)] && degree(x, y) === 1) {
        endpoints.push({ x, y });
      }
    }
  }
  endpoints.sort((a, b) => a.x - b.x || a.y - b.y);

  const paths: StrokePoint[][] = [];
  for (const ep of endpoints) {
    if (visited[idx(w, ep.x, ep.y)]) continue;
    const path = walk(ep.x, ep.y);
    if (path.length >= minLen) paths.push(simplifyPolyline(path, 1.1));
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (skeleton[idx(w, x, y)] && !visited[idx(w, x, y)]) {
        const path = walk(x, y);
        if (path.length >= minLen) paths.push(simplifyPolyline(path, 1.1));
      }
    }
  }

  return paths.sort((a, b) => a[0].x - b[0].x || a[0].y - b[0].y);
}

function maskFromCanvas(canvas: HTMLCanvasElement): {
  mask: Uint8Array;
  w: number;
  h: number;
} {
  const w = canvas.width;
  const h = canvas.height;
  const { data } = canvas.getContext("2d")!.getImageData(0, 0, w, h);
  const mask = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      mask[idx(w, x, y)] = data[i + 3] > 18 ? 1 : 0;
    }
  }

  return { mask, w, h };
}

function mapPathsToTarget(
  paths: StrokePoint[][],
  pixelW: number,
  pixelH: number,
  targetW: number,
  targetH: number,
): StrokePoint[][] {
  const sx = targetW / pixelW;
  const sy = targetH / pixelH;
  return paths.map((path) =>
    resampleStroke(
      path.map((p) => ({ x: p.x * sx, y: p.y * sy })),
      Math.max(20, Math.min(72, path.length * 2)),
    ),
  );
}

function erosionSkeletonPaths(mask: Uint8Array, w: number, h: number): StrokePoint[][] {
  let current = mask.slice();
  const skeleton = new Uint8Array(w * h);
  const nbrs = neighbors8();

  const erode = (src: Uint8Array): Uint8Array => {
    const out = new Uint8Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        if (!src[idx(w, x, y)]) continue;
        let keep = true;
        for (const [dx, dy] of nbrs) {
          if (!src[idx(w, x + dx, y + dy)]) {
            keep = false;
            break;
          }
        }
        out[idx(w, x, y)] = keep ? 1 : 0;
      }
    }
    return out;
  };

  for (let iter = 0; iter < 64; iter++) {
    let remaining = 0;
    for (let i = 0; i < current.length; i++) if (current[i]) remaining++;
    if (remaining === 0) break;

    const next = erode(current);
    for (let i = 0; i < skeleton.length; i++) {
      if (current[i] && !next[i]) skeleton[i] = 1;
    }
    current = next;
  }

  return traceSkeletonPaths(skeleton, w, h, 2);
}

function centroidWritingPaths(
  mask: Uint8Array,
  w: number,
  h: number,
): StrokePoint[][] {
  const rows: StrokePoint[] = [];
  for (let y = 0; y < h; y++) {
    let sumX = 0;
    let count = 0;
    for (let x = 0; x < w; x++) {
      if (mask[idx(w, x, y)]) {
        sumX += x;
        count++;
      }
    }
    if (count > 0) rows.push({ x: sumX / count, y });
  }

  if (rows.length < 2) return [];

  const segments: StrokePoint[][] = [];
  let seg: StrokePoint[] = [rows[0]];

  for (let i = 1; i < rows.length; i++) {
    const gap = rows[i].y - rows[i - 1].y;
    if (gap > 4) {
      if (seg.length >= 2) segments.push(seg);
      seg = [rows[i]];
    } else {
      seg.push(rows[i]);
    }
  }
  if (seg.length >= 2) segments.push(seg);

  return segments.map((s) => simplifyPolyline(s, 1.5));
}

function extractPerGlyphPaths(
  settings: SignatureSettings,
  width: number,
  height: number,
): StrokePoint[][] {
  const probe = document.createElement("canvas");
  probe.width = width;
  probe.height = height;
  const ctx = probe.getContext("2d");
  if (!ctx) return [];

  const layout = prepareSignatureLayout(ctx, settings, width, height);
  const paths: StrokePoint[][] = [];
  const pad = Math.ceil(layout.fontSize * 0.35);

  layout.glyphs.forEach((glyph) => {
    if (glyph.char === " ") return;

    const boxW = Math.ceil(glyph.w + pad * 2);
    const boxH = Math.ceil(layout.fontSize * 1.3 + pad * 2);
    const gCanvas = document.createElement("canvas");
    gCanvas.width = Math.floor(boxW * EXTRACT_SCALE);
    gCanvas.height = Math.floor(boxH * EXTRACT_SCALE);
    const gCtx = gCanvas.getContext("2d")!;
    gCtx.setTransform(EXTRACT_SCALE, 0, 0, EXTRACT_SCALE, 0, 0);
    gCtx.clearRect(0, 0, boxW, boxH);
    drawGlyph(
      gCtx,
      {
        ...glyph,
        x: pad + glyph.w / 2,
        baselineY: pad + layout.fontSize * 0.65,
      },
      layout,
      1,
      1,
    );

    const { mask, w, h } = maskFromCanvas(gCanvas);
    if (countMask(mask) < 8) return;

    let local = traceSkeletonPaths(thinMask(mask, w, h), w, h, 2);
    if (local.length === 0) local = erosionSkeletonPaths(mask, w, h);

    const originX = glyph.x - pad - glyph.w / 2;
    const originY =
      glyph.baselineY + glyph.dy - (pad + layout.fontSize * 0.65);
    const sx = boxW / w;
    const sy = boxH / h;

    local.forEach((path) => {
      paths.push(
        path.map((p) => ({
          x: originX + p.x * sx,
          y: originY + p.y * sy,
        })),
      );
    });

    if (local.length === 0) {
      paths.push([
        { x: glyph.x - glyph.w * 0.4, y: glyph.baselineY + glyph.dy },
        { x: glyph.x + glyph.w * 0.4, y: glyph.baselineY + glyph.dy - layout.fontSize * 0.15 },
        { x: glyph.x + glyph.w * 0.35, y: glyph.baselineY + glyph.dy + layout.fontSize * 0.1 },
      ]);
    }
  });

  return paths;
}

function extractInkPaths(
  inkCanvas: HTMLCanvasElement,
  settings: SignatureSettings,
  targetW: number,
  targetH: number,
): StrokePoint[][] {
  const { mask, w, h } = maskFromCanvas(inkCanvas);
  if (countMask(mask) === 0) {
    return extractPerGlyphPaths(settings, targetW, targetH);
  }

  let paths = traceSkeletonPaths(thinMask(mask, w, h), w, h, 3);
  if (paths.length === 0) paths = traceSkeletonPaths(mask, w, h, 3);
  if (paths.length === 0) paths = erosionSkeletonPaths(mask, w, h);
  if (paths.length === 0) paths = centroidWritingPaths(mask, w, h);
  if (paths.length === 0) paths = extractPerGlyphPaths(settings, targetW, targetH);

  return mapPathsToTarget(paths, w, h, targetW, targetH).filter((p) => p.length >= 2);
}

function toSignatureStrokes(paths: StrokePoint[][]): SignatureStroke[] {
  return paths.map((points, i) => ({
    id: `ink-${i}`,
    order: i,
    label: `Stroke ${i + 1}`,
    points,
  }));
}

export function inkLessonDuration(strokes: SignatureStroke[]): number {
  const total = strokes.reduce(
    (sum, s) => sum + resampleStroke(s.points, 48).length,
    0,
  );
  return Math.min(12, Math.max(3, total * 0.022));
}

/** Derive pen paths from the rendered signature bitmap (matches Studio output). */
export async function buildInkLessonAssets(
  settings: SignatureSettings,
  width: number,
  height: number,
): Promise<InkLessonAssets> {
  const key = cacheKey(settings, width, height);
  const hit = cache.get(key);
  if (hit && hit.strokes.length > 0) return hit;

  if (typeof document === "undefined") {
    throw new Error("buildInkLessonAssets is client-only");
  }

  await ensureSignatureFonts(settings);

  let bgImage: HTMLImageElement | null = null;
  if (settings.backgroundImage) {
    try {
      bgImage = await loadBackgroundImage(settings.backgroundImage);
    } catch {
      bgImage = null;
    }
  }

  const ghostCanvas = renderOffscreen(settings, width, height, bgImage, true);

  const inkCanvas = renderOffscreen(
    settings,
    width * EXTRACT_SCALE,
    height * EXTRACT_SCALE,
    bgImage,
    false,
  );

  let paths = extractInkPaths(inkCanvas, settings, width, height);

  if (paths.length === 0) {
    const retryCanvas = renderOffscreen(
      settings,
      width,
      height,
      null,
      false,
    );
    paths = extractInkPaths(retryCanvas, settings, width, height);
  }

  const strokes = toSignatureStrokes(paths);
  const lineWidth =
    2.2 + (settings.pressure / 100) * 2.5 + settings.size * 0.4;

  const assets: InkLessonAssets = {
    strokes,
    ghostCanvas,
    inkColor: settings.inkColor,
    lineWidth,
  };

  if (strokes.length > 0) {
    cache.set(key, assets);
  }

  return assets;
}

export async function buildInkLessonAssetsFromStrokeData(
  data: SignatureStrokeData,
): Promise<InkLessonAssets> {
  return buildInkLessonAssets(data.settings, data.width, data.height);
}

export function clearInkLessonCache(): void {
  cache.clear();
}
