import type { SignatureStrokeData } from "@/lib/stroke-data";
import {
  isValidBaseId,
  type ArtistBaseId,
  type BackgroundFit,
  type SignatureSettings,
  type TemplateTier,
} from "@/lib/signature";

const STORAGE_KEY = "inkflow-signature-library";
const DRAFT_KEY = "inkflow-studio-draft";
const MAX_TEMPLATES = 30;

export type StudioTemplateFilter = "all" | TemplateTier;

export interface StudioDraft {
  settings: SignatureSettings;
  canvasWidth: number;
  canvasHeight: number;
  backgroundEnabled?: boolean;
  /** Keep uploaded showcase image even when the toggle is off. */
  backgroundImage?: string | null;
  templateFilter?: StudioTemplateFilter;
  nlInstruction?: string;
  updatedAt: string;
}

export interface StudioDraftState {
  text: string;
  baseId: ArtistBaseId;
  fluidity: number;
  rhythm: number;
  pressure: number;
  slant: number;
  size: number;
  inkColor: string;
  backgroundImage: string | null;
  backgroundEnabled: boolean;
  backgroundOpacity: number;
  backgroundFit: BackgroundFit;
  templateFilter: StudioTemplateFilter;
  nlInstruction: string;
}

const DEFAULT_STUDIO_STATE: StudioDraftState = {
  text: "A. Harrison",
  baseId: "poet",
  fluidity: 85,
  rhythm: 60,
  pressure: 55,
  slant: 8,
  size: 100,
  inkColor: "#3a2e1a",
  backgroundImage: null,
  backgroundEnabled: false,
  backgroundOpacity: 100,
  backgroundFit: "cover",
  templateFilter: "all",
  nlInstruction: "",
};

export function getDefaultStudioState(): StudioDraftState {
  return { ...DEFAULT_STUDIO_STATE };
}

/** Read persisted Studio state (client-only). */
export function loadStudioDraftState(): StudioDraftState {
  if (typeof window === "undefined") {
    return getDefaultStudioState();
  }

  const draft = getStudioDraft();
  if (!draft?.settings) return getDefaultStudioState();

  const s = draft.settings;
  const backgroundImage =
    draft.backgroundImage ?? s.backgroundImage ?? null;
  const backgroundEnabled =
    draft.backgroundEnabled ?? !!backgroundImage;

  return {
    text: s.text?.trim() || DEFAULT_STUDIO_STATE.text,
    baseId: isValidBaseId(s.baseId) ? s.baseId : DEFAULT_STUDIO_STATE.baseId,
    fluidity: s.fluidity ?? DEFAULT_STUDIO_STATE.fluidity,
    rhythm: s.rhythm ?? DEFAULT_STUDIO_STATE.rhythm,
    pressure: s.pressure ?? DEFAULT_STUDIO_STATE.pressure,
    slant: s.slant ?? DEFAULT_STUDIO_STATE.slant,
    size: Math.round((s.size ?? 1) * 100),
    inkColor: s.inkColor || DEFAULT_STUDIO_STATE.inkColor,
    backgroundImage,
    backgroundEnabled,
    backgroundOpacity: s.backgroundOpacity ?? DEFAULT_STUDIO_STATE.backgroundOpacity,
    backgroundFit: s.backgroundFit === "contain" ? "contain" : "cover",
    templateFilter: draft.templateFilter ?? "all",
    nlInstruction: draft.nlInstruction ?? "",
  };
}

export function studioStateToSettings(
  state: StudioDraftState,
): SignatureSettings {
  return {
    text: state.text,
    baseId: state.baseId,
    fluidity: state.fluidity,
    rhythm: state.rhythm,
    pressure: state.pressure,
    slant: state.slant,
    size: state.size / 100,
    inkColor: state.inkColor,
    backgroundImage: state.backgroundEnabled ? state.backgroundImage : null,
    backgroundOpacity: state.backgroundEnabled
      ? state.backgroundOpacity
      : undefined,
    backgroundFit: state.backgroundEnabled ? state.backgroundFit : undefined,
  };
}

export interface SavedSignature {
  id: string;
  name: string;
  strokeData: SignatureStrokeData;
  savedAt: string;
  /** Cloud saves live in the database; local is legacy browser-only. */
  source?: "cloud" | "local";
}

function writeLibrary(list: SavedSignature[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_TEMPLATES)));
}

export function listSavedSignatures(): SavedSignature[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedSignature[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSignature(
  entry: Omit<SavedSignature, "id" | "savedAt">,
): SavedSignature {
  const list = listSavedSignatures();
  const saved: SavedSignature = {
    ...entry,
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    source: entry.source ?? "local",
  };
  list.unshift(saved);
  writeLibrary(list);
  return saved;
}

export function removeSignature(id: string): void {
  writeLibrary(listSavedSignatures().filter((s) => s.id !== id));
}

export function getSignature(id: string): SavedSignature | undefined {
  return listSavedSignatures().find((s) => s.id === id);
}

export function renameSignature(id: string, name: string): SavedSignature | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const list = listSavedSignatures();
  const idx = list.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], name: trimmed.slice(0, 60) };
  writeLibrary(list);
  return list[idx];
}

export function saveFromStudio(
  strokeData: SignatureStrokeData,
  name?: string,
): SavedSignature {
  return saveSignature({
    name: name ?? strokeData.text,
    strokeData,
  });
}

/** Auto-sync latest Studio canvas state for session restore. */
export function saveStudioDraft(
  draft: Omit<StudioDraft, "updatedAt">,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ ...draft, updatedAt: new Date().toISOString() }),
    );
  } catch {
    /* quota — drop showcase image but keep core settings */
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          ...draft,
          backgroundImage: null,
          settings: {
            ...draft.settings,
            backgroundImage: null,
            backgroundOpacity: undefined,
            backgroundFit: undefined,
          },
          updatedAt: new Date().toISOString(),
        }),
      );
    } catch {
      /* ignore */
    }
  }
}

export function getStudioDraft(): StudioDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StudioDraft;
  } catch {
    return null;
  }
}

export function formatSavedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
