/**
 * Signature template catalog + client-side render engine.
 */

import {
  ARTIST_BASES,
  ARTIST_BASE_IDS,
  type ArtistBase,
  type ArtistBaseId,
  type TemplateCategory,
  type TemplateTier,
} from "@/lib/signature-bases";

export {
  ARTIST_BASES,
  ARTIST_BASE_IDS,
  type ArtistBase,
  type ArtistBaseId,
  type TemplateCategory,
  type TemplateTier,
};

export function getBase(id: ArtistBaseId): ArtistBase {
  return (
    ARTIST_BASES.find((b) => b.id === id) ?? ARTIST_BASES[0]
  ) as ArtistBase;
}

export function isValidBaseId(id: string): id is ArtistBaseId {
  return (ARTIST_BASE_IDS as readonly string[]).includes(id);
}

export function isPremiumBase(id: ArtistBaseId): boolean {
  return getBase(id).tier === "premium";
}

export function canUseTemplate(
  id: ArtistBaseId,
  unlockedIds: readonly string[],
): boolean {
  const b = getBase(id);
  return b.tier === "free" || unlockedIds.includes(id);
}

export function countTemplatesByTier(tier: TemplateTier): number {
  return ARTIST_BASES.filter((b) => b.tier === tier).length;
}

export interface SignatureSettings {
  text: string;
  baseId: ArtistBaseId;
  fluidity: number;
  rhythm: number;
  pressure: number;
  slant: number;
  size: number;
  inkColor: string;
  /** Data URL or remote URL for showcase background behind signature. */
  backgroundImage?: string | null;
  /** 0–100 opacity for background image. */
  backgroundOpacity?: number;
  /** How the background fills the canvas. */
  backgroundFit?: "cover" | "contain";
}

export type BackgroundFit = NonNullable<SignatureSettings["backgroundFit"]>;

const imageCache = new Map<string, Promise<HTMLImageElement>>();

/** Load and cache a background image for canvas rendering (client only). */
export function loadBackgroundImage(src: string): Promise<HTMLImageElement> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("loadBackgroundImage is client-only"));
  }
  let pending = imageCache.get(src);
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Background image failed to load"));
      img.src = src;
    });
    imageCache.set(src, pending);
  }
  return pending;
}

function drawBackgroundLayer(
  ctx: CanvasRenderingContext2D,
  cssWidth: number,
  cssHeight: number,
  img: HTMLImageElement,
  fit: BackgroundFit,
  opacity: number,
): void {
  ctx.save();
  ctx.globalAlpha = Math.min(100, Math.max(0, opacity)) / 100;

  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  let dx = 0;
  let dy = 0;
  let dw = cssWidth;
  let dh = cssHeight;

  if (fit === "cover" && iw > 0 && ih > 0) {
    const scale = Math.max(cssWidth / iw, cssHeight / ih);
    dw = iw * scale;
    dh = ih * scale;
    dx = (cssWidth - dw) / 2;
    dy = (cssHeight - dh) / 2;
  } else if (fit === "contain" && iw > 0 && ih > 0) {
    const scale = Math.min(cssWidth / iw, cssHeight / ih);
    dw = iw * scale;
    dh = ih * scale;
    dx = (cssWidth - dw) / 2;
    dy = (cssHeight - dh) / 2;
  }

  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

export function sanitizeBackgroundImage(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("data:image/")) return null;
  if (value.length > 900_000) return null;
  return value;
}

export function backgroundFieldsFromPartial(
  partial: Partial<SignatureSettings>,
): Pick<SignatureSettings, "backgroundImage" | "backgroundOpacity" | "backgroundFit"> {
  const opacityRaw = Number(partial.backgroundOpacity);
  const opacity = Number.isNaN(opacityRaw)
    ? 100
    : Math.min(100, Math.max(0, opacityRaw));
  return {
    backgroundImage: sanitizeBackgroundImage(partial.backgroundImage),
    backgroundOpacity: opacity,
    backgroundFit: partial.backgroundFit === "contain" ? "contain" : "cover",
  };
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

export interface RenderResult {
  width: number;
  height: number;
}

/** Explicit CSS pixel size for offscreen canvas rendering. */
export interface RenderSize {
  width: number;
  height: number;
}

function resolveCanvasCssSize(
  canvas: HTMLCanvasElement,
  size?: RenderSize,
): { cssWidth: number; cssHeight: number; dpr: number } {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  let cssWidth = size?.width ?? canvas.clientWidth;
  let cssHeight = size?.height ?? canvas.clientHeight;

  if (!cssWidth && canvas.width > 0) {
    cssWidth = Math.round(canvas.width / dpr);
  }
  if (!cssHeight && canvas.height > 0) {
    cssHeight = Math.round(canvas.height / dpr);
  }

  return {
    cssWidth: cssWidth || 600,
    cssHeight: cssHeight || 240,
    dpr,
  };
}

interface GlyphLayout {
  char: string;
  x: number;
  w: number;
  baselineY: number;
  dy: number;
  rot: number;
}

interface SignatureLayout {
  cssWidth: number;
  cssHeight: number;
  fontSize: number;
  base: ArtistBase;
  strokeLayers: number;
  strokeSpread: number;
  slantRad: number;
  glyphs: GlyphLayout[];
  settings: SignatureSettings;
}

function prepareSignatureLayout(
  ctx: CanvasRenderingContext2D,
  settings: SignatureSettings,
  cssWidth: number,
  cssHeight: number,
): SignatureLayout {
  const base = getBase(settings.baseId);
  const text = settings.text.trim() || "Your Name";

  let fontSize =
    Math.min(cssHeight * 0.55, 120) * base.defaults.size * settings.size;

  const rng = mulberry32(hashSeed(text + settings.baseId));
  const letterSpacing = 6 - (settings.fluidity / 100) * 10;
  const jitterAmount = (1 - settings.rhythm / 100) * (fontSize * 0.12);
  const rotJitter = (1 - settings.rhythm / 100) * 0.14;
  const strokeLayers = 1 + Math.round((settings.pressure / 100) * 4);
  const strokeSpread = (settings.pressure / 100) * (fontSize * 0.012) + 0.2;
  const slantRad = (settings.slant * Math.PI) / 180;

  const setFont = (size: number) => {
    ctx.font = `${size}px ${base.fontFamily}`;
  };

  setFont(fontSize);
  const chars = Array.from(text);
  let totalWidth = 0;
  for (const ch of chars) {
    totalWidth += ctx.measureText(ch).width + letterSpacing;
  }
  totalWidth -= letterSpacing;

  const maxWidth = cssWidth * 0.86;
  if (totalWidth > maxWidth && totalWidth > 0) {
    const scale = maxWidth / totalWidth;
    fontSize *= scale;
    setFont(fontSize);
    totalWidth *= scale;
  }

  const startX = (cssWidth - totalWidth) / 2;
  const baselineY = cssHeight / 2 + fontSize * 0.28;
  const spacing = letterSpacing * (fontSize / (fontSize || 1));

  const glyphs: GlyphLayout[] = [];
  let cursorX = startX;

  chars.forEach((ch) => {
    const w = ctx.measureText(ch).width;
    const dy = (rng() - 0.5) * 2 * jitterAmount;
    const rot = (rng() - 0.5) * 2 * rotJitter;
    glyphs.push({
      char: ch,
      x: cursorX + w / 2,
      w,
      baselineY,
      dy,
      rot,
    });
    cursorX += w + spacing;
    if (ch === " ") cursorX += fontSize * 0.08;
  });

  return {
    cssWidth,
    cssHeight,
    fontSize,
    base,
    strokeLayers,
    strokeSpread,
    slantRad,
    glyphs,
    settings,
  };
}

function drawGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: GlyphLayout,
  layout: SignatureLayout,
  partial: number,
  alpha: number,
): void {
  if (glyph.char === " " || partial <= 0 || alpha <= 0) return;

  const { base, settings, strokeLayers, strokeSpread, slantRad, fontSize } =
    layout;
  const w = glyph.w;
  const clipW = w * Math.min(1, Math.max(0, partial));

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = settings.inkColor;
  ctx.font = `${fontSize}px ${base.fontFamily}`;
  ctx.textBaseline = "alphabetic";
  ctx.translate(glyph.x, glyph.baselineY + glyph.dy);
  ctx.transform(1, 0, Math.tan(slantRad) * -1, 1, 0, 0);
  ctx.rotate(glyph.rot);

  if (partial < 1) {
    ctx.beginPath();
    ctx.rect(-w / 2, -fontSize * 0.85, clipW, fontSize * 1.5);
    ctx.clip();
  }

  for (let layer = 0; layer < strokeLayers; layer++) {
    const ox = (layer - (strokeLayers - 1) / 2) * strokeSpread;
    ctx.fillText(glyph.char, -w / 2 + ox, 0);
  }
  ctx.restore();
}

function drawSignatureGlyphs(
  ctx: CanvasRenderingContext2D,
  layout: SignatureLayout,
  progress: number,
  showGhost: boolean,
): void {
  const drawable = layout.glyphs.filter((g) => g.char !== " ");
  const totalWeight = drawable.reduce((sum, g) => sum + g.w, 0) || 1;
  let inkBudget = Math.min(1, Math.max(0, progress)) * totalWeight;

  if (showGhost) {
    drawable.forEach((g) => drawGlyph(ctx, g, layout, 1, 0.14));
  }

  for (const glyph of drawable) {
    if (inkBudget <= 0) break;
    const used = Math.min(glyph.w, inkBudget);
    drawGlyph(ctx, glyph, layout, used / glyph.w, 1);
    inkBudget -= glyph.w;
  }
}

export function signatureLessonDuration(settings: SignatureSettings): number {
  const chars = Array.from(settings.text.trim() || "Your Name").filter(
    (ch) => ch !== " ",
  ).length;
  return Math.min(7, Math.max(2.5, 1.2 + chars * 0.35));
}

/** Progressive reveal — matches Studio `renderSignature` exactly. */
export function renderSignatureProgress(
  canvas: HTMLCanvasElement,
  settings: SignatureSettings,
  progress: number,
  backgroundImage?: HTMLImageElement | null,
  options?: { showGhost?: boolean; paperBackground?: boolean },
  size?: RenderSize,
): RenderResult {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { width: 0, height: 0 };

  const { cssWidth, cssHeight, dpr } = resolveCanvasCssSize(canvas, size);

  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  if (options?.paperBackground) {
    ctx.fillStyle = "#fdfbf7";
    ctx.fillRect(0, 0, cssWidth, cssHeight);
  }

  if (backgroundImage && settings.backgroundImage) {
    drawBackgroundLayer(
      ctx,
      cssWidth,
      cssHeight,
      backgroundImage,
      settings.backgroundFit ?? "cover",
      settings.backgroundOpacity ?? 100,
    );
  }

  const layout = prepareSignatureLayout(ctx, settings, cssWidth, cssHeight);
  drawSignatureGlyphs(
    ctx,
    layout,
    progress,
    options?.showGhost ?? progress < 1,
  );

  return { width: cssWidth, height: cssHeight };
}

export { prepareSignatureLayout, drawGlyph, type SignatureLayout, type GlyphLayout };

export function renderSignature(
  canvas: HTMLCanvasElement,
  settings: SignatureSettings,
  backgroundImage?: HTMLImageElement | null,
  size?: RenderSize,
): RenderResult {
  return renderSignatureProgress(canvas, settings, 1, backgroundImage, {
    showGhost: false,
  }, size);
}

export function signatureToSvg(
  settings: SignatureSettings,
  width = 800,
  height = 320,
): string {
  const base = getBase(settings.baseId);
  const text = (settings.text.trim() || "Your Name").replace(
    /[<>&]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] as string,
  );
  const fontSize =
    Math.min(height * 0.5, 140) * base.defaults.size * settings.size;
  const family = base.fontFamily.replace(/'/g, "");
  const slant = settings.slant;
  const bg = sanitizeBackgroundImage(settings.backgroundImage);
  const bgOpacity = ((settings.backgroundOpacity ?? 100) / 100).toFixed(2);
  const preserve =
    settings.backgroundFit === "contain" ? "xMidYMid meet" : "xMidYMid slice";
  const bgEl = bg
    ? `<image href="${escapeSvgAttr(bg)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="${preserve}" opacity="${bgOpacity}"/>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>text { font-family: ${family}, cursive; }</style>
  ${bgEl}
  <rect width="100%" height="100%" fill="none"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-size="${fontSize.toFixed(0)}" fill="${settings.inkColor}"
        transform="skewX(${(-slant).toFixed(1)})" transform-origin="center">${text}</text>
</svg>`;
}

function escapeSvgAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
