import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { AI_PHOTO_STYLES, getAiPhotoStyle } from "@/lib/ai-photo-styles";

/**
 * Server-only style resolution. Merges the built-in catalog in
 * `ai-photo-styles.ts` (client-safe, images in public/) with admin-uploaded
 * `AiStyleAsset` rows (images stored as Bytes in Postgres, editable without a
 * redeploy). Keep prisma access here — never in `ai-photo-styles.ts`.
 */

export interface ResolvedAiStyle {
  id: string;
  name: string;
  prompt: string;
}

/** Built-in style first, else an active DB style, else the default built-in. */
export async function resolveAiStyle(styleId?: string): Promise<ResolvedAiStyle> {
  const builtIn = AI_PHOTO_STYLES.find((s) => s.id === styleId);
  if (builtIn) return builtIn;
  if (styleId) {
    const row = await prisma.aiStyleAsset.findFirst({
      where: { id: styleId, active: true },
      select: { id: true, name: true, prompt: true },
    });
    if (row) return row;
  }
  return getAiPhotoStyle(undefined);
}

/** Load the style's reference image as a data URL (null if unavailable). */
export async function loadStyleReferenceDataUrl(
  styleId: string,
): Promise<string | null> {
  const builtIn = AI_PHOTO_STYLES.find((s) => s.id === styleId);
  if (builtIn) {
    try {
      const file = path.join(
        process.cwd(),
        "public",
        "images",
        "ai-styles",
        builtIn.file,
      );
      const buf = await readFile(file);
      const mime = builtIn.file.endsWith(".png") ? "image/png" : "image/jpeg";
      return `data:${mime};base64,${buf.toString("base64")}`;
    } catch {
      return null;
    }
  }

  const row = await prisma.aiStyleAsset.findFirst({
    where: { id: styleId, active: true },
    select: { image: true, mimeType: true },
  });
  if (!row) return null;
  return `data:${row.mimeType};base64,${Buffer.from(row.image).toString("base64")}`;
}

/**
 * Admin-uploaded reference photos appended to the AI redesign call as extra
 * style guides. Capped to keep the fal payload small.
 */
export async function loadActiveRefineReferences(limit = 3): Promise<string[]> {
  const rows = await prisma.refineReference.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    take: limit,
    select: { image: true, mimeType: true },
  });
  return rows.map(
    (r) => `data:${r.mimeType};base64,${Buffer.from(r.image).toString("base64")}`,
  );
}
