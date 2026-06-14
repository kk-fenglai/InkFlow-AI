import type { ImageStats, RefineParams } from "@/lib/ink-refine";
import { analyzeRefineStats } from "@/lib/ink-refine";
import { isValidBaseId, type SignatureSettings } from "@/lib/signature";
import { generateStrokeData } from "@/lib/stroke-data";
export { isValidBaseId };

/** Server-side enhancement pass after user confirms final render. */
export function enhanceSignatureSettings(
  settings: SignatureSettings,
): SignatureSettings & { enhanced: true; aiNote: string } {
  const boost = (v: number, delta: number, max = 100) =>
    Math.min(max, Math.max(1, v + delta));

  const fluidity = boost(settings.fluidity, 4);
  const rhythm = boost(settings.rhythm, 6);
  const pressure = boost(settings.pressure, 5);

  return {
    ...settings,
    fluidity,
    rhythm,
    pressure,
    slant: settings.slant + (settings.slant > 0 ? 1 : -1),
    size: Math.min(1.5, settings.size * 1.02),
    enhanced: true,
    aiNote:
      "InkFlow applied micro-adjustments to fluidity, rhythm, and stroke pressure for a more natural ink bleed.",
  };
}

export interface RefineAiResult extends RefineParams {
  aiNote: string;
}

/** Analyze upload stats (computed client-side) for optimal refine parameters. */
export function analyzeRefineImage(stats?: ImageStats | null): RefineAiResult {
  if (stats && stats.width > 0 && stats.height > 0) {
    return analyzeRefineStats(stats);
  }

  return {
    threshold: 62,
    smoothing: 35,
    inkColor: "#1d1c16",
    refineStrength: 50,
    aiNote:
      "Using default refine parameters — upload analysis unavailable.",
  };
}

export function buildStrokePayload(
  settings: SignatureSettings,
  canvasWidth = 600,
  canvasHeight = 240,
) {
  return generateStrokeData(settings, canvasWidth, canvasHeight);
}
