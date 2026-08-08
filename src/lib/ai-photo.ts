import { type AiPhotoStyle } from "@/lib/ai-photo-styles";
import {
  loadActiveRefineReferences,
  loadStyleReferenceDataUrl,
  resolveAiStyle,
} from "@/lib/ai-style-db";

/**
 * AI photo-signature generation. Two modes, both feeding the Refine
 * extraction pipeline (photo → transparent PNG → captured save):
 *  - style: turn a typed name into an autograph photo, guided by a reference
 *    image from the style catalog (fal Seedream edit; text-prompt fallback on
 *    OpenRouter/Gemini).
 *  - redesign: re-design the user's own uploaded signature photo (fal only).
 * Provider order: FAL_KEY → OPENROUTER_API_KEY → GEMINI_API_KEY.
 */

const GEMINI_MODEL = "gemini-2.5-flash-image";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const OPENROUTER_MODEL = "google/gemini-2.5-flash-image";
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

const FAL_T2I_ENDPOINT = "https://fal.run/fal-ai/bytedance/seedream/v4/text-to-image";
const FAL_EDIT_ENDPOINT = "https://fal.run/fal-ai/bytedance/seedream/v4/edit";

/**
 * Non-negotiable signature realism: every generation must read as a fast
 * scrawled personal autograph, never as neat lettering or a typography logo.
 */
const SIGNATURE_QUALITIES = [
  "It must be written as ONE fast continuous cursive motion, the pen almost never lifting — every letter connected and flowing into the next.",
  "Loose, scrawled, dashed off in two seconds with personality and attitude; partially illegible is desirable, like a real celebrity autograph.",
  "Thin-to-medium dynamic pen strokes with natural speed taper.",
  "Absolutely NOT neat typography, NOT a lettering logo, NOT decorative display letters, NOT carefully drawn calligraphy — it must look signed, not designed.",
].join(" ");

/** The user's own free-text tweak, appended after the style description. */
function customClause(custom?: string): string[] {
  const c = custom?.trim();
  return c ? [`Additional request from the signer (follow it where possible): ${c}.`] : [];
}

/** Style-aware text prompt used when no reference image can be sent. */
export function buildAutographPrompt(
  name: string,
  style: Pick<AiPhotoStyle, "prompt">,
  custom?: string,
): string {
  return [
    `A scrawled handwritten personal signature of the name "${name}", black fountain-pen ink on clean white paper, featuring ${style.prompt}.`,
    SIGNATURE_QUALITIES,
    ...customClause(custom),
    "Minimalist composition: only the signature, centered, lots of empty space, no other text, watermark, logo, or decoration.",
    "High contrast, clean plain background.",
  ].join(" ");
}

/** Prompt for style mode when the reference image IS attached. */
function buildStyleGuidedPrompt(
  name: string,
  style: Pick<AiPhotoStyle, "prompt">,
  custom?: string,
): string {
  return [
    `Use the reference image only as a handwriting style guide: ${style.prompt}.`,
    `Sign the name "${name}" as a scrawled handwritten autograph in exactly that style, black ink on a clean plain white background.`,
    SIGNATURE_QUALITIES,
    ...customClause(custom),
    `Output only the signature of "${name}" — do not copy any words, letters, watermarks, logos, or captions from the reference image.`,
  ].join(" ");
}

const REDESIGN_PROMPT = [
  "Redesign the handwritten signature in this photo into a more confident, expressive version of itself.",
  "Keep the same name and letterforms recognizable, but re-sign it faster and looser, with flowing connected strokes and a bold personal flourish.",
  SIGNATURE_QUALITIES,
  "Black ink on a clean plain white background. Output only the redesigned signature — no other text, watermark, or decoration.",
].join(" ");

export interface AiPhotoResult {
  ok: boolean;
  /** PNG/JPEG data URL of the generated signature photo. */
  image?: string;
  error?: string;
}

export function aiPhotoConfigured(): boolean {
  return Boolean(
    process.env.FAL_KEY?.trim() ||
      process.env.OPENROUTER_API_KEY?.trim() ||
      process.env.GEMINI_API_KEY?.trim(),
  );
}

/** Generate an autograph photo for `name` in the given catalog style. */
export async function generateSignatureImage(
  name: string,
  styleId?: string,
  custom?: string,
): Promise<AiPhotoResult> {
  const style = await resolveAiStyle(styleId);
  const falKey = process.env.FAL_KEY?.trim();
  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  let last: AiPhotoResult | null = null;

  if (falKey) {
    const reference = await loadStyleReferenceDataUrl(style.id);
    last = reference
      ? await falEdit(buildStyleGuidedPrompt(name, style, custom), [reference], falKey)
      : await falTextToImage(buildAutographPrompt(name, style, custom), falKey);
    if (last.ok) return last;
  }

  if (openrouterKey) {
    last = await generateViaOpenRouter(buildAutographPrompt(name, style, custom), openrouterKey);
    if (last.ok) return last;
  }

  if (geminiKey) {
    last = await generateViaGemini(buildAutographPrompt(name, style, custom), geminiKey);
    if (last.ok) return last;
  }

  return (
    last ?? {
      ok: false,
      error:
        "AI photo generation is not configured (missing FAL_KEY, OPENROUTER_API_KEY, or GEMINI_API_KEY).",
    }
  );
}

/** Redesign the user's own signature photo (data URL). fal-only for now. */
export async function redesignSignatureImage(
  imageDataUrl: string,
): Promise<AiPhotoResult> {
  const falKey = process.env.FAL_KEY?.trim();
  if (!falKey) {
    return {
      ok: false,
      error: "AI redesign requires the fal.ai provider (missing FAL_KEY).",
    };
  }
  const references = await loadActiveRefineReferences();
  const prompt = references.length
    ? `${REDESIGN_PROMPT} The first image is the signature to redesign; the additional images are style references — match their stroke quality, speed, and energy only, never their letterforms or names.`
    : REDESIGN_PROMPT;
  return falEdit(prompt, [imageDataUrl, ...references], falKey);
}

async function falTextToImage(
  prompt: string,
  apiKey: string,
): Promise<AiPhotoResult> {
  return falRequest(FAL_T2I_ENDPOINT, { prompt, image_size: "landscape_4_3", num_images: 1 }, apiKey);
}

async function falEdit(
  prompt: string,
  imageUrls: string[],
  apiKey: string,
): Promise<AiPhotoResult> {
  return falRequest(
    FAL_EDIT_ENDPOINT,
    { prompt, image_urls: imageUrls, image_size: "landscape_4_3", num_images: 1 },
    apiKey,
  );
}

async function falRequest(
  endpoint: string,
  body: Record<string, unknown>,
  apiKey: string,
): Promise<AiPhotoResult> {
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: "Could not reach the image service." };
  }

  if (!res.ok) {
    return {
      ok: false,
      error: `Image service error (${res.status}). Please try again.`,
    };
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return { ok: false, error: "Image service returned an invalid response." };
  }

  const url = (data as { images?: { url?: string }[] })?.images?.[0]?.url;
  if (!url) {
    return { ok: false, error: "The model returned no image. Please retry." };
  }
  if (url.startsWith("data:image/")) {
    return { ok: true, image: url };
  }

  // fal returns a hosted URL — download and inline it as a data URL so the
  // client pipeline treats every provider identically.
  try {
    const imgRes = await fetch(url);
    if (!imgRes.ok) throw new Error(`download ${imgRes.status}`);
    const mime = imgRes.headers.get("content-type") ?? "image/png";
    const buf = Buffer.from(await imgRes.arrayBuffer());
    return { ok: true, image: `data:${mime};base64,${buf.toString("base64")}` };
  } catch {
    return { ok: false, error: "Could not download the generated image." };
  }
}

async function generateViaOpenRouter(
  prompt: string,
  apiKey: string,
): Promise<AiPhotoResult> {
  let res: Response;
  try {
    res = await fetch(OPENROUTER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
  } catch {
    return { ok: false, error: "Could not reach the image service." };
  }

  if (!res.ok) {
    return {
      ok: false,
      error: `Image service error (${res.status}). Please try again.`,
    };
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return { ok: false, error: "Image service returned an invalid response." };
  }

  const images =
    (data as {
      choices?: {
        message?: { images?: { image_url?: { url?: string } }[] };
      }[];
    })?.choices?.[0]?.message?.images ?? [];

  for (const img of images) {
    const url = img.image_url?.url;
    if (url?.startsWith("data:image/")) {
      return { ok: true, image: url };
    }
  }
  return { ok: false, error: "The model returned no image. Please retry." };
}

async function generateViaGemini(
  prompt: string,
  apiKey: string,
): Promise<AiPhotoResult> {
  let res: Response;
  try {
    res = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    });
  } catch {
    return { ok: false, error: "Could not reach the image service." };
  }

  if (!res.ok) {
    return {
      ok: false,
      error: `Image service error (${res.status}). Please try again.`,
    };
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return { ok: false, error: "Image service returned an invalid response." };
  }

  const image = extractInlineImage(data);
  if (!image) {
    return { ok: false, error: "The model returned no image. Please retry." };
  }
  return { ok: true, image };
}

function extractInlineImage(data: unknown): string | null {
  const parts =
    (data as {
      candidates?: {
        content?: {
          parts?: { inlineData?: { mimeType?: string; data?: string } }[];
        };
      }[];
    })?.candidates?.[0]?.content?.parts ?? [];

  for (const part of parts) {
    const inline = part.inlineData;
    if (inline?.data && inline.mimeType?.startsWith("image/")) {
      return `data:${inline.mimeType};base64,${inline.data}`;
    }
  }
  return null;
}
