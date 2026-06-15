import type { ArtistBaseId, SignatureSettings } from "@/lib/signature";
import { ARTIST_BASE_IDS } from "@/lib/signature";
import { chatCompletionsUrl, getLlmTuneConfig } from "@/lib/llm-tune-config";

export interface TuneResult {
  settings: SignatureSettings;
  aiNote: string;
  source: "llm" | "rules";
  applied: string[];
}

interface TuneDeltas {
  fluidity?: number;
  rhythm?: number;
  pressure?: number;
  slant?: number;
  size?: number;
  baseId?: ArtistBaseId;
}

const KEYWORD_RULES: {
  pattern: RegExp;
  apply: (s: SignatureSettings) => TuneDeltas;
  label: string;
}[] = [
  {
    pattern:
      /流畅|更流|连笔|flowing|fluid|smooth|connected|elegant|graceful/i,
    apply: () => ({ fluidity: 12, rhythm: 4, slant: 2 }),
    label: "increased fluidity & connection",
  },
  {
    pattern: /商务|专业|正式|稳重|business|professional|formal|corporate|executive/i,
    apply: () => ({
      fluidity: -10,
      rhythm: 12,
      pressure: -8,
      slant: -4,
      baseId: "executive",
    }),
    label: "business-like restraint",
  },
  {
    pattern: /艺术|浪漫|飘逸|artistic|romantic|expressive|poetic/i,
    apply: () => ({ fluidity: 10, rhythm: -6, pressure: 6, baseId: "poet" }),
    label: "artistic expressiveness",
  },
  {
    pattern: /粗|厚|bold|thick|heavy|strong|decisive/i,
    apply: () => ({ pressure: 14, size: 0.06 }),
    label: "heavier stroke weight",
  },
  {
    pattern: /细|轻|thin|light|delicate|subtle/i,
    apply: () => ({ pressure: -14, size: -0.04 }),
    label: "lighter strokes",
  },
  {
    pattern: /乱|随意|潦草|casual|messy|scratchy|quick/i,
    apply: () => ({ rhythm: -14, fluidity: 8, pressure: 10 }),
    label: "casual scratch energy",
  },
  {
    pattern: /稳|整齐|consistent|steady|even|uniform/i,
    apply: () => ({ rhythm: 14, fluidity: -4 }),
    label: "steadier rhythm",
  },
  {
    pattern: /大|放大|bigger|larger|grand/i,
    apply: () => ({ size: 0.1 }),
    label: "larger scale",
  },
  {
    pattern: /小|缩小|smaller|compact|tiny/i,
    apply: () => ({ size: -0.1 }),
    label: "smaller scale",
  },
  {
    pattern: /斜|倾斜|slant|italic|forward/i,
    apply: () => ({ slant: 6 }),
    label: "forward slant",
  },
  {
    pattern: /直| upright|vertical|straight/i,
    apply: (s) => ({ slant: s.slant > 0 ? -6 : 6 }),
    label: "upright alignment",
  },
  {
    pattern: /极简|简洁|minimal|clean|simple|modern/i,
    apply: () => ({
      fluidity: -8,
      pressure: -10,
      rhythm: 10,
      baseId: "classic",
    }),
    label: "minimal clarity",
  },
  {
    pattern: /个性|大胆|maverick|confident|round/i,
    apply: () => ({ pressure: 10, rhythm: 8, baseId: "bold" }),
    label: "confident character",
  },
  {
    pattern: /最后一笔|收尾|尾巴|拉长|extend|tail|flourish|underline/i,
    apply: () => ({ fluidity: 8, size: 0.05, slant: 3 }),
    label: "extended flourish",
  },
];

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function applyDeltas(
  settings: SignatureSettings,
  deltas: TuneDeltas,
): SignatureSettings {
  return {
    ...settings,
    baseId: deltas.baseId ?? settings.baseId,
    fluidity: clamp(
      settings.fluidity + (deltas.fluidity ?? 0),
      1,
      100,
    ),
    rhythm: clamp(settings.rhythm + (deltas.rhythm ?? 0), 1, 100),
    pressure: clamp(settings.pressure + (deltas.pressure ?? 0), 1, 100),
    slant: clamp(settings.slant + (deltas.slant ?? 0), -20, 20),
    size: clamp(settings.size + (deltas.size ?? 0), 0.5, 1.5),
  };
}

/** Rule-based NL parser — works offline, bilingual EN/ZH. */
export function tuneFromRules(
  instruction: string,
  settings: SignatureSettings,
): TuneResult {
  const applied: string[] = [];
  let next = { ...settings };

  for (const rule of KEYWORD_RULES) {
    if (rule.pattern.test(instruction)) {
      next = applyDeltas(next, rule.apply(settings));
      applied.push(rule.label);
    }
  }

  if (applied.length === 0) {
    next = applyDeltas(next, {
      fluidity: 3,
      rhythm: 2,
      pressure: 2,
    });
    applied.push("subtle polish (no keyword matched)");
  }

  return {
    settings: next,
    aiNote: `Applied: ${applied.join("; ")}.`,
    source: "rules",
    applied,
  };
}

/** Optional LLM tuning (DeepSeek / OpenAI-compatible) when API key is set. */
export async function tuneFromLlm(
  instruction: string,
  settings: SignatureSettings,
): Promise<TuneResult | null> {
  const llm = getLlmTuneConfig();
  if (!llm) return null;

  const system = `You adjust signature rendering parameters based on user instructions.
Return ONLY valid JSON with keys: fluidity, rhythm, pressure, slant, size, baseId, note.
Each numeric field is a DELTA to add to current values (not absolute).
baseId must be one of: ${ARTIST_BASE_IDS.join(", ")} — or omit if unchanged.
Keep deltas modest (typically -20..20 for 1-100 params, -0.15..0.15 for size).`;

  const userPayload = {
    instruction,
    current: {
      baseId: settings.baseId,
      fluidity: settings.fluidity,
      rhythm: settings.rhythm,
      pressure: settings.pressure,
      slant: settings.slant,
      size: settings.size,
    },
  };

  try {
    const res = await fetch(chatCompletionsUrl(llm), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${llm.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: llm.model,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(userPayload) },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(
        `[nl-tune] ${llm.provider} request failed (${res.status}): ${errText.slice(0, 200)}`,
      );
      return null;
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw) as TuneDeltas & { note?: string };
    const validBases: ArtistBaseId[] = [...ARTIST_BASE_IDS];
    const baseId =
      parsed.baseId && validBases.includes(parsed.baseId)
        ? parsed.baseId
        : undefined;

    const tuned = applyDeltas(settings, {
      fluidity: parsed.fluidity,
      rhythm: parsed.rhythm,
      pressure: parsed.pressure,
      slant: parsed.slant,
      size: parsed.size,
      baseId,
    });

    return {
      settings: tuned,
      aiNote: parsed.note ?? "AI adjusted parameters from your instruction.",
      source: "llm",
      applied: ["llm structured tuning"],
    };
  } catch (err) {
    console.warn("[nl-tune] LLM request error:", err);
    return null;
  }
}

export async function tuneSignature(
  instruction: string,
  settings: SignatureSettings,
): Promise<TuneResult> {
  const trimmed = instruction.trim();
  if (!trimmed) {
    return tuneFromRules("polish", settings);
  }

  const llm = await tuneFromLlm(trimmed, settings);
  if (llm) return llm;

  return tuneFromRules(trimmed, settings);
}
