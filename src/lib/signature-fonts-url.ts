import { ARTIST_BASES } from "@/lib/signature-bases";

function extractFamily(fontFamily: string): string {
  const quoted = fontFamily.match(/^'([^']+)'/);
  if (quoted) return quoted[1];
  return fontFamily.split(",")[0]?.trim() ?? fontFamily;
}

const families = [
  ...new Set(ARTIST_BASES.map((b) => extractFamily(b.fontFamily))),
];

/** Single deferred stylesheet — only injected on Studio routes. */
export const SIGNATURE_FONTS_STYLESHEET = `https://fonts.googleapis.com/css2?${families
  .map((f) => `family=${f.replace(/ /g, "+")}`)
  .join("&")}&display=swap`;
