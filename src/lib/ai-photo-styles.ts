/**
 * AI Autograph style catalog. Each entry maps a reference photo (served from
 * /images/ai-styles/, used as a style guide for image-to-image generation) to
 * a prompt fragment describing the handwriting style for text-only fallbacks.
 * Client-safe: no server imports.
 */

export interface AiPhotoStyle {
  id: string;
  name: string;
  blurb: string;
  /** Public URL of the reference thumbnail. */
  thumb: string;
  /** File name inside public/images/ai-styles/ (read server-side). */
  file: string;
  /** Style description merged into the generation prompt. */
  prompt: string;
}

export const AI_PHOTO_STYLES: readonly AiPhotoStyle[] = [
  {
    id: "loop-sweep",
    name: "Loop Sweep",
    blurb: "Celebrity loop underline",
    thumb: "/images/ai-styles/loop-sweep.png",
    file: "loop-sweep.png",
    prompt:
      "an oversized first letter with a tall steep diagonal upstroke, compressed barely-legible middle letters, and a final stroke sweeping right then curling back into one large elliptical loop that underlines and encircles the whole name; heavy ink pressure, strong right slant",
  },
  {
    id: "ascend",
    name: "Ascending Dash",
    blurb: "Rising casual hand",
    thumb: "/images/ai-styles/ascend.png",
    file: "ascend.png",
    prompt:
      "a casual fast hand rising diagonally to the right, mixing print and cursive letterforms, with one long straight upstroke crossing the name and a short dash underneath; light playful ink",
  },
  {
    id: "initial-flow",
    name: "Initial & Flow",
    blurb: "Big initial, wavy tail",
    thumb: "/images/ai-styles/initial-flow.png",
    file: "initial-flow.png",
    prompt:
      "a large stylized initial letter followed by a period, then the rest of the name as one low flowing wave, finished with a long thin underline; minimalist composition",
  },
  {
    id: "ligature",
    name: "Ligature Cross",
    blurb: "Crossbar through name",
    thumb: "/images/ai-styles/ligature.png",
    file: "ligature.png",
    prompt:
      "tall angular letterforms joined by one continuous thin horizontal crossbar running through the whole name, fine fountain-pen nib, fast designer handwriting",
  },
  {
    id: "wave",
    name: "Wave Underline",
    blurb: "Rhythmic monoline waves",
    thumb: "/images/ai-styles/wave.png",
    file: "wave.png",
    prompt:
      "compact rhythmic wave-like cursive with one sharp V-shaped dip, elegant monoline ink, and a long tail sweeping back beneath the name",
  },
  {
    id: "classic",
    name: "Classic Cursive",
    blurb: "Readable flowing script",
    thumb: "/images/ai-styles/classic.png",
    file: "classic.png",
    prompt:
      "rounded, legible flowing cursive with generous looping capitals and a gentle ending curl; friendly balanced rhythm, medium ink weight",
  },
  {
    id: "brush",
    name: "Brush Slant",
    blurb: "Dry-brush street energy",
    thumb: "/images/ai-styles/brush.png",
    file: "brush.png",
    prompt:
      "heavy dry-brush strokes with a strong diagonal slant, overlapping bold capitals and rough textured edges; streetwear autograph energy",
  },
  {
    id: "vintage",
    name: "Vintage Flourish",
    blurb: "Ornate retro swashes",
    thumb: "/images/ai-styles/vintage.png",
    file: "vintage.png",
    prompt:
      "vintage flourished handwriting with ornate swashes, curled crossbars and generous round flourish loops; retro fountain-pen ink, thick expressive strokes",
  },
  {
    id: "monoline",
    name: "Fine Monoline",
    blurb: "Elegant thin script",
    thumb: "/images/ai-styles/monoline.png",
    file: "monoline.png",
    prompt:
      "an elegant thin monoline script with very tall graceful ascenders and smooth fashion-editorial curves, finished with a small period",
  },
  // Photo-derived styles — cleaned reference templates from
  // signature_ai_photo/unified (white background, black ink).
  {
    id: "star-scrawl",
    name: "Star Scrawl",
    blurb: "Fast celebrity scrawl",
    thumb: "/images/ai-styles/star-scrawl.png",
    file: "star-scrawl.png",
    prompt:
      "a fast celebrity scrawl with compressed barely-legible letters flowing into a long horizontal strike-through underline, heavy confident marker ink",
  },
  {
    id: "grand-slant",
    name: "Grand Slant",
    blurb: "Dramatic steep loops",
    thumb: "/images/ai-styles/grand-slant.png",
    file: "grand-slant.png",
    prompt:
      "dramatic steeply slanted cursive with huge narrow diagonal loops and tall ascenders crossing each other, elegant theatrical fountain-pen ink",
  },
  {
    id: "open-loop",
    name: "Open Loop",
    blurb: "Rounded open curves",
    thumb: "/images/ai-styles/open-loop.png",
    file: "open-loop.png",
    prompt:
      "large rounded open loops with generous circular capitals and a relaxed trailing wave, warm vintage Hollywood autograph, medium ink weight",
  },
  {
    id: "spaced-script",
    name: "Spaced Script",
    blurb: "Elegant separated words",
    thumb: "/images/ai-styles/spaced-script.png",
    file: "spaced-script.png",
    prompt:
      "an elegant cursive with clearly separated words, delicate thin connecting strokes and graceful restrained capitals, refined and legible",
  },
  {
    id: "golden-era",
    name: "Golden Era",
    blurb: "Vintage rounded hand",
    thumb: "/images/ai-styles/golden-era.png",
    file: "golden-era.png",
    prompt:
      "a 1940s vintage rounded handwriting with plump looping capitals and steady even rhythm, classic fountain-pen autograph of the golden screen era",
  },
  {
    id: "low-wave",
    name: "Low Wave",
    blurb: "Low rolling cursive",
    thumb: "/images/ai-styles/low-wave.png",
    file: "low-wave.png",
    prompt:
      "a low rolling connected cursive hugging the baseline with soft rounded waves and a long stretched ending stroke, understated and lyrical",
  },
  {
    id: "sweep-tail",
    name: "Sweep Tail",
    blurb: "Long horizontal sweep",
    thumb: "/images/ai-styles/sweep-tail.png",
    file: "sweep-tail.png",
    prompt:
      "sweeping horizontal strokes with a huge opening curve and an extra-long flat tail extending far right, wide cinematic composition, confident ink",
  },
  {
    id: "opera-loop",
    name: "Opera Loop",
    blurb: "Big looping capitals",
    thumb: "/images/ai-styles/opera-loop.png",
    file: "opera-loop.png",
    prompt:
      "grand looping capitals with tall crossing ascenders and rich rounded connected letters, expressive operatic flourish, strong ink pressure",
  },
  {
    id: "rock-flourish",
    name: "Rock Flourish",
    blurb: "Grand underlined loops",
    thumb: "/images/ai-styles/rock-flourish.png",
    file: "rock-flourish.png",
    prompt:
      "flamboyant rock-and-roll autograph with grand interlocking loops and a long rising underline sweeping beneath the whole name, vintage showman energy",
  },
  {
    id: "bold-stroke",
    name: "Bold Stroke",
    blurb: "Heavy brush signature",
    thumb: "/images/ai-styles/bold-stroke.png",
    file: "bold-stroke.png",
    prompt:
      "a heavy bold brush signature with thick decisive strokes, a long crossing capital sweep and deep descending loops, powerful graphic presence",
  },
  {
    id: "airy-cross",
    name: "Airy Cross",
    blurb: "Thin crossing strokes",
    thumb: "/images/ai-styles/airy-cross.png",
    file: "airy-cross.png",
    prompt:
      "a thin airy script with long intersecting diagonal strokes, a huge open capital loop crossing the name and delicate hairline connections, light graceful ink",
  },
  {
    id: "oval-capital",
    name: "Oval Capital",
    blurb: "Huge oval initial",
    thumb: "/images/ai-styles/oval-capital.png",
    file: "oval-capital.png",
    prompt:
      "one huge oval capital letter opening the name, followed by small flowing connected letters and a soft trailing line, chic modern autograph",
  },
  {
    id: "marker-bold",
    name: "Marker Bold",
    blurb: "Thick marker underline",
    thumb: "/images/ai-styles/marker-bold.png",
    file: "marker-bold.png",
    prompt:
      "a thick bold marker autograph with abbreviated initial-led letters and a long double underline sweeping right, punchy sports-star energy",
  },
  {
    id: "quick-scrawl",
    name: "Quick Scrawl",
    blurb: "Compact rapid scrawl",
    thumb: "/images/ai-styles/quick-scrawl.png",
    file: "quick-scrawl.png",
    prompt:
      "a compact rapid scrawl signed in one continuous motion with a sharp crossing stroke, small and efficient everyday real-pen signature",
  },
] as const;

export type AiPhotoStyleId = (typeof AI_PHOTO_STYLES)[number]["id"];

export const DEFAULT_AI_PHOTO_STYLE_ID: AiPhotoStyleId = "loop-sweep";

export function getAiPhotoStyle(id: string | undefined): AiPhotoStyle {
  return (
    AI_PHOTO_STYLES.find((s) => s.id === id) ??
    AI_PHOTO_STYLES.find((s) => s.id === DEFAULT_AI_PHOTO_STYLE_ID)!
  );
}
