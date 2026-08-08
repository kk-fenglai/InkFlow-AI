/** Image statistics computed client-side and sent to the refine API. */
export interface ImageStats {
  width: number;
  height: number;
  meanLuminance: number;
  stdLuminance: number;
  darkPixelRatio: number;
  paperLuminance: number;
  inkLuminance: number;
}

export interface RefineParams {
  threshold: number;
  smoothing: number;
  inkColor: string;
  refineStrength: number;
  aiNote: string;
}

export interface ProcessInkOptions {
  threshold: number;
  smoothing: number;
  inkColor: string;
  transparentBg: boolean;
  refineStrength?: number;
}

/** Compute histogram-based stats from raw RGBA image data. */
export function computeImageStats(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): ImageStats {
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  const lumSamples: number[] = [];

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 16) continue;
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sum += lum;
    sumSq += lum * lum;
    count++;
    lumSamples.push(lum);
  }

  if (count === 0) {
    return {
      width,
      height,
      meanLuminance: 255,
      stdLuminance: 0,
      darkPixelRatio: 0,
      paperLuminance: 255,
      inkLuminance: 0,
    };
  }

  lumSamples.sort((a, b) => a - b);
  const mean = sum / count;
  const variance = sumSq / count - mean * mean;
  const darkPixelRatio =
    lumSamples.filter((l) => l < 128).length / lumSamples.length;

  const paperLuminance = percentile(lumSamples, 0.85);
  const inkLuminance = percentile(lumSamples, 0.12);

  return {
    width,
    height,
    meanLuminance: mean,
    stdLuminance: Math.sqrt(Math.max(0, variance)),
    darkPixelRatio,
    paperLuminance,
    inkLuminance,
  };
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.floor(p * (sorted.length - 1));
  return sorted[idx] ?? sorted[0] ?? 0;
}

/** Otsu optimal threshold on luminance histogram. */
export function otsuThreshold(lumSamples: number[]): number {
  if (lumSamples.length === 0) return 128;
  const hist = new Array(256).fill(0);
  for (const l of lumSamples) hist[Math.min(255, Math.floor(l))]++;

  const total = lumSamples.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];

  let sumB = 0;
  let wB = 0;
  let maxVar = 0;
  let best = 128;

  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;

    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > maxVar) {
      maxVar = between;
      best = t;
    }
  }
  return best;
}

/** Derive refine sliders from image statistics (server or client). */
export function analyzeRefineStats(stats: ImageStats): RefineParams {
  const contrast = stats.paperLuminance - stats.inkLuminance;
  const lowContrast = contrast < 40;
  const veryDarkInk = stats.inkLuminance < 60;
  const noisy = stats.stdLuminance > 55;

  let threshold = ((stats.paperLuminance + stats.inkLuminance) / 2 / 255) * 100;
  threshold = clamp(threshold, 35, 82);

  if (lowContrast) threshold -= 8;
  if (veryDarkInk) threshold += 6;
  if (stats.darkPixelRatio > 0.45) threshold += 5;

  let smoothing = noisy ? 48 : stats.stdLuminance > 35 ? 38 : 28;
  if (lowContrast) smoothing += 8;

  let refineStrength = 50;
  if (lowContrast) refineStrength = 65;
  if (noisy) refineStrength = 72;

  const notes: string[] = [];
  if (lowContrast) notes.push("boosted separation for faint ink");
  if (noisy) notes.push("increased smoothing for paper noise");
  if (stats.darkPixelRatio < 0.02) notes.push("light ink detected — lower threshold");

  return {
    threshold: Math.round(threshold),
    smoothing: Math.round(smoothing),
    inkColor: veryDarkInk ? "#1d1c16" : "#3a2e1a",
    refineStrength: Math.round(refineStrength),
    aiNote:
      notes.length > 0
        ? `Analysis: ${notes.join("; ")}.`
        : "Analysis tuned threshold and smoothing for your upload.",
  };
}

/** Isolate ink strokes with optional strength-based cleanup. */
export function processInkPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  opts: ProcessInkOptions,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length);
  const cut = (opts.threshold / 100) * 255;
  const ramp = Math.max(1, (opts.smoothing / 100) * 120);
  const strength = (opts.refineStrength ?? 50) / 100;
  const ink = hexToRgb(opts.inkColor);
  const bg = opts.transparentBg ? null : { r: 253, g: 251, b: 247 };

  const lum = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const a = data[i + 3];
      lum[y * width + x] =
        a === 0
          ? 255
          : 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
  }

  const smoothed = boxBlurLum(lum, width, height, strength > 0.5 ? 1 : 0);

  const n = width * height;
  const soft = new Float32Array(n);
  const alphaArr = new Float32Array(n);
  for (let p = 0; p < n; p++) {
    const l = smoothed[p];
    let alpha = 1 - (l - (cut - ramp)) / (2 * ramp);
    alpha = Math.max(0, Math.min(1, alpha));
    soft[p] = alpha;

    if (strength > 0.55 && alpha > 0.15 && alpha < 0.85) {
      alpha = alpha > 0.5 ? 1 : 0;
    }
    alphaArr[p] = alpha;
  }

  despeckle(alphaArr, soft, width, height, strength);

  for (let p = 0; p < n; p++) {
    const i = p * 4;
    const alpha = alphaArr[p];
    if (bg && alpha < 1) {
      const ia = alpha;
      out[i] = ink.r * ia + bg.r * (1 - ia);
      out[i + 1] = ink.g * ia + bg.g * (1 - ia);
      out[i + 2] = ink.b * ia + bg.b * (1 - ia);
      out[i + 3] = 255;
    } else {
      out[i] = ink.r;
      out[i + 1] = ink.g;
      out[i + 2] = ink.b;
      out[i + 3] = Math.round(alpha * 255);
    }
  }

  return out;
}

/**
 * Remove small isolated ink islands — AI-image ghosting and paper specks.
 * An island is dropped when it is tiny, or small AND faint (low pre-harden
 * alpha). Solid marks like i-dots and periods stay: they are dark, so their
 * mean soft alpha is high.
 */
function despeckle(
  alpha: Float32Array,
  soft: Float32Array,
  width: number,
  height: number,
  strength: number,
): void {
  const n = width * height;
  // Include soft halos in each island so removal leaves no residue behind.
  const mask = new Uint8Array(n);
  for (let p = 0; p < n; p++) mask[p] = alpha[p] > 0.12 ? 1 : 0;

  const labels = new Int32Array(n);
  const minSpeck = Math.max(6, Math.round(n * 2e-5 * (0.5 + strength)));
  const faintMax = Math.round(n * 0.002);
  const faintCut = 0.35 + 0.25 * strength;
  const stack: number[] = [];
  const pixels: number[] = [];
  let label = 0;

  for (let p = 0; p < n; p++) {
    if (!mask[p] || labels[p]) continue;
    label++;
    stack.length = 0;
    pixels.length = 0;
    stack.push(p);
    labels[p] = label;
    let sumSoft = 0;

    while (stack.length) {
      const q = stack.pop()!;
      pixels.push(q);
      sumSoft += soft[q];
      const qx = q % width;
      const qy = (q - qx) / width;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = qx + dx;
          const ny = qy + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const np = ny * width + nx;
          if (mask[np] && !labels[np]) {
            labels[np] = label;
            stack.push(np);
          }
        }
      }
    }

    const area = pixels.length;
    const meanSoft = sumSoft / area;
    if (area < minSpeck || (area < faintMax && meanSoft < faintCut)) {
      for (const q of pixels) alpha[q] = 0;
    }
  }
}

function boxBlurLum(
  src: Float32Array,
  width: number,
  height: number,
  radius: number,
): Float32Array {
  if (radius <= 0) return src;
  const out = new Float32Array(src.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let n = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            sum += src[ny * width + nx];
            n++;
          }
        }
      }
      out[y * width + x] = sum / n;
    }
  }
  return out;
}

/** Trace alpha edges into a simplified SVG path (vector export). */
export function traceToSvgPath(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  step = 4,
): string {
  const segments: string[] = [];
  let path = "";
  let drawing = false;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4 + 3;
      const ink = data[i] > 80;
      if (ink && !drawing) {
        path += `M ${x} ${y} `;
        drawing = true;
      } else if (ink && drawing) {
        path += `L ${x} ${y} `;
      } else if (!ink && drawing) {
        drawing = false;
      }
    }
    if (drawing) {
      segments.push(path.trim());
      path = "";
      drawing = false;
    }
  }
  if (path.trim()) segments.push(path.trim());
  return segments.join(" ");
}

function hexToRgb(hex: string) {
  const m = hex.replace("#", "");
  return {
    r: parseInt(m.slice(0, 2), 16),
    g: parseInt(m.slice(2, 4), 16),
    b: parseInt(m.slice(4, 6), 16),
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
