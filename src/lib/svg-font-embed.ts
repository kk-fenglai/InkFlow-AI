import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ArtistBase } from "@/lib/signature";

/**
 * Builds an `@font-face` rule with the font binary inlined as a data URL, so an
 * exported SVG carries its own typeface.
 *
 * Without this the SVG is just `<text font-family="Great Vibes">`, which renders
 * in whatever fallback the viewer's machine has — the signature people paid to
 * export looks like a different signature on any computer that lacks the font.
 *
 * Server-only: reads from disk and fetches from Google Fonts.
 */

/** Font binaries are immutable; one fetch per family per server instance. */
const cache = new Map<string, string | null>();

/** `"Art Aline Signature", cursive` -> `Art Aline Signature` */
export function primaryFamily(fontFamily: string): string {
  const first = fontFamily.split(",")[0]?.trim() ?? fontFamily;
  return first.replace(/^['"]|['"]$/g, "");
}

async function localFontDataUrl(baseId: string): Promise<string | null> {
  const slug = baseId.replace(/^art-/, "");
  const dir = path.join(process.cwd(), "public", "fonts", "art");
  for (const [ext, mime] of [
    [".ttf", "font/ttf"],
    [".otf", "font/otf"],
  ] as const) {
    try {
      const buf = await readFile(path.join(dir, `${slug}${ext}`));
      return `data:${mime};base64,${buf.toString("base64")}`;
    } catch {
      // Try the next extension.
    }
  }
  return null;
}

async function googleFontDataUrl(family: string): Promise<string | null> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}`;
  // The UA decides the format Google serves; this one gets woff2.
  const css = await fetch(cssUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    },
  }).then((r) => (r.ok ? r.text() : null));
  if (!css) return null;

  const src = css.match(/src:\s*url\(([^)]+)\)\s*format\('(woff2|truetype|opentype)'\)/);
  if (!src) return null;

  const binary = await fetch(src[1]!).then((r) => (r.ok ? r.arrayBuffer() : null));
  if (!binary) return null;

  const mime =
    src[2] === "woff2" ? "font/woff2" : src[2] === "truetype" ? "font/ttf" : "font/otf";
  return `data:${mime};base64,${Buffer.from(binary).toString("base64")}`;
}

/**
 * Returns a ready-to-inline `@font-face` rule, or `""` when the font could not
 * be resolved — the SVG still exports, just without the embedded face.
 */
export async function fontFaceRuleFor(base: ArtistBase): Promise<string> {
  const family = primaryFamily(base.fontFamily);
  if (!cache.has(family)) {
    try {
      cache.set(
        family,
        base.source === "local"
          ? await localFontDataUrl(base.id)
          : await googleFontDataUrl(family),
      );
    } catch {
      cache.set(family, null);
    }
  }

  const dataUrl = cache.get(family);
  if (!dataUrl) return "";
  return `@font-face{font-family:"${family}";src:url(${dataUrl});}`;
}
