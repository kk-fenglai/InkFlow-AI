"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import SignatureCanvas, {
  type SignatureCanvasHandle,
} from "@/components/SignatureCanvas";
import OnboardingBanner from "@/components/OnboardingBanner";
import { useCredits } from "@/hooks/useCredits";
import { trackEvent } from "@/lib/analytics";
import {
  ARTIST_BASES,
  countTemplatesByTier,
  getBase,
  type ArtistBaseId,
  type SignatureSettings,
  type BackgroundFit,
  type TemplateTier,
} from "@/lib/signature";
import {
  loadStudioDraftState,
  saveStudioDraft,
  type StudioTemplateFilter,
} from "@/lib/signature-library";
import {
  MAX_BACKGROUND_BYTES,
  SHOWCASE_PRESETS,
} from "@/lib/signature-backgrounds";
import { generateStrokeData } from "@/lib/stroke-data";
import type { SignatureStrokeData } from "@/lib/stroke-data";
import { saveCloudSignature } from "@/lib/signature-api";
import { CREDIT_COST, AI_TUNE_USES_PER_CREDIT } from "@/lib/constants";
import { tuneFromRules } from "@/lib/nl-tune";
import { downloadCanvasPng } from "@/lib/canvas-export";
import { useTemplateUnlocks } from "@/hooks/useTemplateUnlocks";

type TemplateFilter = StudioTemplateFilter;

const INK_COLORS = [
  { label: "Sepia Ink", value: "#3a2e1a" },
  { label: "Charcoal", value: "#1d1c16" },
  { label: "Royal Blue", value: "#1f3a64" },
  { label: "Burgundy", value: "#5a1422" },
  { label: "Gold", value: "#8f6e2d" },
];

function Slider({
  label,
  value,
  onChange,
  min = 1,
  max = 100,
  leftHint,
  rightHint,
  unit = "%",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  leftHint: string;
  rightHint: string;
  unit?: string;
}) {
  return (
    <div className="flex flex-col gap-sm">
      <div className="flex justify-between items-center">
        <label className="font-label-md text-label-md text-on-surface">
          {label}
        </label>
        <span className="font-label-sm text-label-sm text-on-surface-variant">
          {value}
          {unit}
        </span>
      </div>
      <input
        className="w-full"
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="flex justify-between font-label-sm text-label-sm text-outline mt-xs">
        <span>{leftHint}</span>
        <span>{rightHint}</span>
      </div>
    </div>
  );
}

export default function StudioPage() {
  const initial = useMemo(() => loadStudioDraftState(), []);
  const draftReadyRef = useRef(false);

  const [text, setText] = useState(initial.text);
  const [baseId, setBaseId] = useState<ArtistBaseId>(initial.baseId);
  const [fluidity, setFluidity] = useState(initial.fluidity);
  const [rhythm, setRhythm] = useState(initial.rhythm);
  const [pressure, setPressure] = useState(initial.pressure);
  const [slant, setSlant] = useState(initial.slant);
  const [size, setSize] = useState(initial.size);
  const [inkColor, setInkColor] = useState(initial.inkColor);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(
    initial.backgroundImage,
  );
  const [backgroundEnabled, setBackgroundEnabled] = useState(
    initial.backgroundEnabled,
  );
  const [backgroundOpacity, setBackgroundOpacity] = useState(
    initial.backgroundOpacity,
  );
  const [backgroundFit, setBackgroundFit] = useState<BackgroundFit>(
    initial.backgroundFit,
  );
  const [rendered, setRendered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [tuneFeedback, setTuneFeedback] = useState<{
    tone: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [aiNote, setAiNote] = useState("");
  const [nlInstruction, setNlInstruction] = useState(initial.nlInstruction);
  const [lastStrokeData, setLastStrokeData] = useState<SignatureStrokeData | null>(
    null,
  );
  const [templateFilter, setTemplateFilter] = useState<TemplateFilter>(
    initial.templateFilter,
  );

  const canvasRef = useRef<SignatureCanvasHandle>(null);
  const { credits, authenticated, refresh } = useCredits();
  const {
    isUnlocked,
    unlockTemplate,
    refresh: refreshUnlocks,
  } = useTemplateUnlocks();

  const currentBase = getBase(baseId);
  const templateLocked =
    currentBase.tier === "premium" && !isUnlocked(baseId, "premium");

  const filteredBases = useMemo(() => {
    if (templateFilter === "all") return ARTIST_BASES;
    return ARTIST_BASES.filter((b) => b.tier === templateFilter);
  }, [templateFilter]);

  function requireUnlockedTemplate(): boolean {
    if (!templateLocked) return true;
    setStatusMsg(
      `Unlock “${currentBase.name}” (${CREDIT_COST.TEMPLATE_UNLOCK} credit) to export or save.`,
    );
    return false;
  }

  const settings: SignatureSettings = useMemo(
    () => ({
      text,
      baseId,
      fluidity,
      rhythm,
      pressure,
      slant,
      size: size / 100,
      inkColor,
      backgroundImage: backgroundEnabled ? backgroundImage : null,
      backgroundOpacity: backgroundEnabled ? backgroundOpacity : undefined,
      backgroundFit: backgroundEnabled ? backgroundFit : undefined,
    }),
    [
      text,
      baseId,
      fluidity,
      rhythm,
      pressure,
      slant,
      size,
      inkColor,
      backgroundEnabled,
      backgroundImage,
      backgroundOpacity,
      backgroundFit,
    ],
  );

  useEffect(() => {
    draftReadyRef.current = true;
  }, []);

  useEffect(() => {
    if (!draftReadyRef.current) return;
    const canvas = canvasRef.current?.getCanvas();
    saveStudioDraft({
      settings,
      canvasWidth: canvas?.clientWidth ?? 600,
      canvasHeight: canvas?.clientHeight ?? 240,
      backgroundEnabled,
      backgroundImage,
      templateFilter,
      nlInstruction,
    });
  }, [
    settings,
    backgroundEnabled,
    backgroundImage,
    templateFilter,
    nlInstruction,
  ]);

  function applyBaseDefaults(id: ArtistBaseId) {
    const b = getBase(id);
    setBaseId(id);
    setFluidity(b.defaults.fluidity);
    setRhythm(b.defaults.rhythm);
    setPressure(b.defaults.pressure);
    setSlant(b.defaults.slant);
    setStatusMsg("");
  }

  function onBackgroundUpload(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatusMsg("Background must be a PNG or JPG image.");
      return;
    }
    if (file.size > MAX_BACKGROUND_BYTES) {
      setStatusMsg("Background image must be under 800 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setBackgroundImage(String(reader.result));
      setStatusMsg("");
    };
    reader.readAsDataURL(file);
  }

  async function unlockCurrentTemplate() {
    if (!authenticated) {
      setStatusMsg("Sign in to unlock premium templates.");
      return;
    }
    if (!templateLocked) return;

    setBusy(true);
    setStatusMsg("");
    try {
      const result = await unlockTemplate(baseId);
      if (!result.ok) {
        if (result.code === "INSUFFICIENT_CREDITS") {
          setStatusMsg(
            `Need ${CREDIT_COST.TEMPLATE_UNLOCK} credit to unlock. You have ${credits}.`,
          );
        } else {
          setStatusMsg(result.error ?? "Unlock failed.");
        }
        return;
      }
      await refreshUnlocks();
      refresh();
      setStatusMsg(
        `Unlocked “${currentBase.name}”. ${result.creditsRemaining ?? credits} credit(s) left.`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveToCloud() {
    if (!authenticated) {
      setStatusMsg("Sign in to save signatures to your cloud library.");
      return;
    }
    if (templateLocked) {
      setStatusMsg(
        `Unlock “${currentBase.name}” (${CREDIT_COST.TEMPLATE_UNLOCK} cr) before saving a premium template.`,
      );
      return;
    }
    setBusy(true);
    setStatusMsg("");
    try {
      const canvas = canvasRef.current?.getCanvas();
      const strokeData =
        lastStrokeData ??
        generateStrokeData(
          settings,
          canvas?.clientWidth ?? 600,
          canvas?.clientHeight ?? 240,
        );

      const result = await saveCloudSignature({
        name: text.trim() || "My Signature",
        strokeData,
      });

      if (result.code === "UNAUTHORIZED" || !result.ok) {
        if (result.code === "INSUFFICIENT_CREDITS") {
          setStatusMsg(
            `Premium templates cost ${CREDIT_COST.SAVE_SIGNATURE} credit to save. Buy credits on Pricing.`,
          );
        } else {
          setStatusMsg(result.error ?? "Cloud save failed.");
        }
        return;
      }

      if (result.signature) {
        setLastStrokeData(result.signature.strokeData);
      }
      const charged = currentBase.tier === "premium";
      setStatusMsg(
        charged
          ? `Saved “${result.signature?.name}” (${CREDIT_COST.SAVE_SIGNATURE} cr). ${result.creditsRemaining} credit(s) left.`
          : `Saved “${result.signature?.name}” to cloud library — free for free templates.`,
      );
      refresh();
    } catch {
      setStatusMsg("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function tuneWithAi() {
    if (!nlInstruction.trim()) {
      setTuneFeedback({
        tone: "error",
        text: "Describe how you want to adjust the signature.",
      });
      return;
    }

    setBusy(true);
    setTuneFeedback(null);
    setAiNote("");

    const applyTuned = (tuned: SignatureSettings) => {
      setFluidity(tuned.fluidity);
      setRhythm(tuned.rhythm);
      setPressure(tuned.pressure);
      setSlant(tuned.slant);
      setSize(Math.round(tuned.size * 100));
      if (tuned.baseId) setBaseId(tuned.baseId);
    };

    if (!authenticated) {
      const result = tuneFromRules(nlInstruction, settings);
      applyTuned(result.settings);
      setAiNote(`${result.aiNote} (offline rules)`);
      setTuneFeedback({
        tone: "info",
        text: "Applied with offline rules. Sign in to track usage and enable server AI when configured.",
      });
      setBusy(false);
      return;
    }

    try {
      const res = await fetch("/api/tune", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: nlInstruction, settings }),
      });
      const data = await res.json();

      if (res.status === 401) {
        setTuneFeedback({
          tone: "error",
          text: "Session expired — please sign in again.",
        });
        return;
      }
      if (res.status === 402) {
        setTuneFeedback({
          tone: "error",
          text:
            data.error ??
            `Need 1 credit every ${AI_TUNE_USES_PER_CREDIT} AI tunes (${data.credits ?? 0} left).`,
        });
        return;
      }
      if (!res.ok) {
        setTuneFeedback({
          tone: "error",
          text: data.error ?? "Tuning failed. Try again.",
        });
        return;
      }

      applyTuned(data.settings as SignatureSettings);
      setAiNote(
        `${data.aiNote}${data.source === "llm" ? " (AI)" : " (rules)"}`,
      );
      setTuneFeedback({
        tone: "success",
        text: data.charged
          ? `Applied — 1 credit used (${data.creditsRemaining} left). Next ${AI_TUNE_USES_PER_CREDIT} uses free in this cycle.`
          : `Applied — ${data.usesUntilCharge ?? "?"} more free tune(s) before next credit.`,
      });
      refresh();
    } catch {
      setTuneFeedback({
        tone: "error",
        text: "Network error. Check your connection and try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function renderFinalInk() {
    if (!requireUnlockedTemplate()) return;
    setBusy(true);
    setStatusMsg("");
    setAiNote("");
    try {
      const canvas = canvasRef.current?.getCanvas();
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          canvasWidth: canvas?.clientWidth ?? 600,
          canvasHeight: canvas?.clientHeight ?? 240,
        }),
      });
      const data = await res.json();

      if (res.status === 401) {
        setStatusMsg("Sign in to use credits.");
        return;
      }
      if (res.status === 402) {
        setStatusMsg(
          `Need 1 credit (${data.credits ?? 0} left). Buy credits on Pricing.`,
        );
        return;
      }
      if (!res.ok) {
        setStatusMsg(data.error ?? "Generation failed.");
        return;
      }

      const enhanced = data.settings as SignatureSettings;
      setAiNote(data.aiNote ?? "");

      if (data.strokeData) {
        setLastStrokeData(data.strokeData as SignatureStrokeData);
      }

      const exportCanvas = canvasRef.current?.getCanvas();
      if (!exportCanvas) return;
      downloadCanvasPng(exportCanvas, `${safeName(text)}.png`);
      setRendered(true);
      setStatusMsg(
        `Final ink exported. ${data.creditsRemaining} credit(s) remaining. Save to Cloud Library when ready.`,
      );
      refresh();
    } catch {
      setStatusMsg("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function downloadSvg() {
    if (!requireUnlockedTemplate()) return;
    if (!authenticated || credits < CREDIT_COST.SVG_EXPORT) {
      setStatusMsg(
        `SVG export requires ${CREDIT_COST.SVG_EXPORT} credit — sign in or buy credits.`,
      );
      return;
    }
    void (async () => {
      setBusy(true);
      setStatusMsg("");
      try {
        const res = await fetch("/api/export/svg", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.code === "INSUFFICIENT_CREDITS") {
            setStatusMsg(`Need ${CREDIT_COST.SVG_EXPORT} credit for SVG export.`);
          } else {
            setStatusMsg(data.error ?? "SVG export failed.");
          }
          return;
        }
        const blob = new Blob([data.svg as string], { type: "image/svg+xml" });
        triggerDownload(URL.createObjectURL(blob), `${safeName(text)}.svg`);
        trackEvent("export_svg");
        refresh();
        setRendered(true);
        setStatusMsg("SVG exported.");
      } catch {
        setStatusMsg("Network error. Try again.");
      } finally {
        setBusy(false);
      }
    })();
  }

  return (
    <main className="page-main flex flex-col gap-lg sm:gap-xl">
      <OnboardingBanner />
      <div className="flex flex-col lg:flex-row gap-xl">
      {/* Left: preview + bases */}
      <div className="flex-grow flex flex-col gap-xl min-w-0">
        <section className="flex flex-col gap-sm">
          <div className="flex justify-between items-end mb-sm">
            <h1 className="font-headline-sm text-headline-sm text-on-surface sm:font-headline-md sm:text-headline-md">
              Artisan Canvas
            </h1>
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest opacity-70">
              Live Render
            </span>
          </div>

          <div className="w-full aspect-[16/9] lg:aspect-[2/1] rounded-lg border border-outline-variant/30 studio-light-canvas relative flex items-center justify-center overflow-hidden">
            <SignatureCanvas
              ref={canvasRef}
              settings={settings}
              className="w-full h-full block"
            />
            {templateLocked && (
              <div className="absolute inset-x-0 bottom-0 bg-on-surface/75 text-surface px-md py-sm flex flex-wrap items-center justify-between gap-sm">
                <span className="font-label-sm text-label-sm">
                  Premium preview · unlock to export &amp; save
                </span>
                <button
                  type="button"
                  onClick={unlockCurrentTemplate}
                  disabled={busy}
                  className="px-sm py-xs bg-tertiary text-on-tertiary rounded font-label-sm hover:bg-tertiary/90 disabled:opacity-50"
                >
                  Unlock ({CREDIT_COST.TEMPLATE_UNLOCK} cr)
                </button>
              </div>
            )}
            <div className="absolute top-md left-md w-4 h-4 border-t border-l border-outline-variant/50" />
            <div className="absolute top-md right-md w-4 h-4 border-t border-r border-outline-variant/50" />
            <div className="absolute bottom-md left-md w-4 h-4 border-b border-l border-outline-variant/50" />
            <div className="absolute bottom-md right-md w-4 h-4 border-b border-r border-outline-variant/50" />
          </div>

          {/* Name input */}
          <div className="mt-md flex flex-col sm:flex-row gap-md items-stretch sm:items-end">
            <div className="flex-grow flex flex-col gap-xs">
              <label
                htmlFor="sig-name"
                className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest"
              >
                Your Name
              </label>
              <input
                id="sig-name"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type your name…"
                maxLength={40}
                className="w-full bg-surface-container-lowest border-b-2 border-outline-variant focus:border-tertiary outline-none input-inset rounded px-md py-sm font-body-lg text-body-lg text-on-surface transition-colors"
              />
            </div>
            <div className="flex flex-col gap-xs">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
                Ink
              </span>
              <div className="flex gap-sm">
                {INK_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    aria-label={c.label}
                    title={c.label}
                    onClick={() => setInkColor(c.value)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      inkColor === c.value
                        ? "border-tertiary scale-110"
                        : "border-outline-variant/40"
                    }`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* AI Natural Language Tune — left column, large */}
          <div
            id="ai-tune"
            className="mt-lg p-lg rounded-xl border-2 border-tertiary/35 bg-tertiary/5 shadow-sm flex flex-col gap-md"
          >
            <div>
              <label
                htmlFor="nl-tune"
                className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-sm"
              >
                <span className="material-symbols-outlined text-tertiary text-[24px]">
                  psychology
                </span>
                AI Natural Language Tune
              </label>
              <p className="font-body-md text-body-md text-on-surface-variant mt-sm">
                Describe the signature style you want — AI adjusts fluidity, rhythm,
                pressure, and slant for you.
                {!authenticated && (
                  <>
                    {" "}
                    <Link href="/login" className="text-tertiary underline">
                      Sign in
                    </Link>{" "}
                    to sync usage ({AI_TUNE_USES_PER_CREDIT} uses = 1 credit).
                  </>
                )}
              </p>
            </div>
            <textarea
              id="nl-tune"
              value={nlInstruction}
              onChange={(e) => setNlInstruction(e.target.value)}
              placeholder={`e.g.\n"Make it more fluid and connected"\n"更流畅、更有商务感"\n"Thicker strokes, extend the final flourish"`}
              rows={5}
              maxLength={200}
              className="w-full min-h-[140px] bg-surface-container-lowest border border-outline-variant rounded-lg px-md py-md font-body-lg text-body-lg text-on-surface resize-y focus:border-tertiary outline-none leading-relaxed"
            />
            <div className="flex flex-wrap items-center justify-between gap-sm">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {nlInstruction.length}/200 · {AI_TUNE_USES_PER_CREDIT} uses = 1 credit
              </span>
              <button
                type="button"
                onClick={tuneWithAi}
                disabled={busy}
                className="px-xl py-md bg-tertiary text-on-tertiary rounded-lg font-label-md text-label-md hover:bg-tertiary/90 transition-colors disabled:opacity-50 shrink-0"
              >
                {busy ? "Applying…" : "Apply AI Tune"}
              </button>
            </div>
            {tuneFeedback && (
              <p
                className={`font-body-md text-body-md rounded-lg px-md py-sm ${
                  tuneFeedback.tone === "error"
                    ? "bg-error/10 text-error"
                    : tuneFeedback.tone === "success"
                      ? "bg-tertiary/10 text-on-surface"
                      : "bg-surface-container-low text-on-surface-variant"
                }`}
                role="status"
              >
                {tuneFeedback.text}
              </p>
            )}
            {aiNote && (
              <p className="font-body-md text-body-md text-tertiary/90 border-t border-tertiary/20 pt-md">
                {aiNote}
              </p>
            )}
          </div>

        </section>

        {/* Artist bases */}
        <section className="flex flex-col gap-md pt-lg border-t border-surface-container-high w-full">
          <div className="flex flex-wrap justify-between items-center gap-sm">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">
                Signature Templates
              </h2>
              <p className="font-label-sm text-label-sm text-on-surface-variant mt-xs">
                {countTemplatesByTier("free")} free · {countTemplatesByTier("premium")}{" "}
                premium ({CREDIT_COST.TEMPLATE_UNLOCK} cr unlock)
              </p>
            </div>
            <div className="flex gap-xs">
              {(["all", "free", "premium"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setTemplateFilter(f)}
                  className={`px-sm py-xs rounded-full font-label-sm text-label-sm border transition-colors ${
                    templateFilter === f
                      ? "bg-tertiary text-on-tertiary border-tertiary"
                      : "border-outline-variant text-on-surface-variant hover:border-tertiary"
                  }`}
                >
                  {f === "all" ? "All" : f === "free" ? "Free" : "Premium"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid max-h-[340px] grid-cols-2 gap-sm overflow-y-auto pr-xs sm:max-h-[520px] sm:grid-cols-2 sm:gap-md md:grid-cols-3 xl:grid-cols-4">
            {filteredBases.map((b) => {
              const active = b.id === baseId;
              const locked =
                b.tier === "premium" && !isUnlocked(b.id, "premium");
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => applyBaseDefaults(b.id)}
                  className="group cursor-pointer text-left"
                >
                  <div
                    className={`aspect-[3/2] rounded-DEFAULT flex items-center justify-center p-md overflow-hidden mb-sm relative transition-colors ${
                      active
                        ? "bg-surface-container-lowest border-2 border-primary"
                        : "bg-surface-container-low border border-surface-dim group-hover:border-tertiary"
                    } ${locked ? "opacity-90" : ""}`}
                  >
                    {b.refImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={b.refImage}
                        alt={`${b.name} style sample`}
                        className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-25 group-hover:opacity-40 transition-opacity"
                      />
                    )}
                    <span
                      style={{ fontFamily: b.fontFamily }}
                      className={`relative z-10 text-[28px] md:text-[32px] leading-none text-on-surface ${
                        active ? "opacity-95" : "opacity-70 group-hover:opacity-100"
                      } transition-opacity`}
                    >
                      {previewWord(text)}
                    </span>
                    <span
                      className={`absolute top-sm left-sm px-xs py-[2px] rounded font-label-sm text-[10px] uppercase tracking-wider ${
                        b.tier === "free"
                          ? "bg-surface/90 text-on-surface-variant"
                          : "bg-tertiary/90 text-on-tertiary"
                      }`}
                    >
                      {b.tier === "free" ? "Free" : `${CREDIT_COST.TEMPLATE_UNLOCK} cr`}
                    </span>
                    {locked && (
                      <span className="absolute top-sm right-sm bg-on-surface/80 text-surface rounded-full p-xs">
                        <span className="material-symbols-outlined text-[14px]">
                          lock
                        </span>
                      </span>
                    )}
                    {active && !locked && (
                      <div className="absolute top-sm right-sm bg-primary text-surface rounded-full p-xs shadow-sm">
                        <span className="material-symbols-outlined filled text-[14px]">
                          check
                        </span>
                      </div>
                    )}
                  </div>
                  <h3 className="font-label-md text-label-md text-on-surface">
                    {b.name}
                  </h3>
                  <p
                    className={`font-label-sm text-label-sm ${
                      active ? "text-tertiary" : "text-on-surface-variant"
                    }`}
                  >
                    {b.blurb}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Right: refinement controls */}
      <aside className="w-full lg:w-80 flex-shrink-0">
        <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-md sm:p-lg lg:sticky lg:top-20 flex flex-col gap-lg sm:gap-xl lg:top-24">
          <div className="border-b border-surface-dim pb-md">
            <h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined filled text-tertiary">
                tune
              </span>
              Refinement
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-sm">
              Fine-tune the nuances of your selected artisan base.
            </p>
          </div>

          {/* Showcase background — optional, off by default */}
          <div
            id="showcase-background"
            className="scroll-mt-24 rounded-lg border border-outline-variant/30 bg-surface-container-lowest"
          >
            <label className="flex items-center gap-sm p-md cursor-pointer select-none">
              <input
                type="checkbox"
                checked={backgroundEnabled}
                onChange={(e) => {
                  const on = e.target.checked;
                  setBackgroundEnabled(on);
                  if (!on) setBackgroundImage(null);
                }}
                className="w-4 h-4 accent-tertiary"
              />
              <span className="font-label-md text-label-md text-on-surface">
                Showcase background
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                (optional)
              </span>
            </label>

            {backgroundEnabled && (
              <div className="px-md pb-md pt-0 border-t border-outline-variant/20 flex flex-col gap-md">
                <p className="font-label-sm text-label-sm text-on-surface-variant pt-md">
                  Add a card or texture behind your signature for exports. Skip this
                  if you only need the signature on a transparent canvas.
                </p>

                <div className="grid grid-cols-2 gap-sm">
                  <button
                    type="button"
                    onClick={() => setBackgroundImage(null)}
                    className={`aspect-[2/1] rounded border-2 flex items-center justify-center font-label-sm text-label-sm transition-colors ${
                      !backgroundImage
                        ? "border-tertiary bg-tertiary/10 text-tertiary"
                        : "border-outline-variant/40 text-on-surface-variant hover:border-tertiary/40"
                    }`}
                  >
                    None
                  </button>
                  {SHOWCASE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      title={preset.name}
                      onClick={() => setBackgroundImage(preset.dataUrl)}
                      className={`aspect-[2/1] rounded border-2 overflow-hidden transition-all hover:scale-[1.02] ${
                        backgroundImage === preset.dataUrl
                          ? "border-tertiary ring-2 ring-tertiary/30"
                          : "border-outline-variant/40"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preset.dataUrl}
                        alt={preset.name}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>

                <label className="flex w-full items-center justify-center gap-sm px-md py-sm rounded border border-outline-variant/50 bg-surface-container-low font-label-sm text-label-sm text-on-surface cursor-pointer hover:border-tertiary/50 transition-colors">
                  <span className="material-symbols-outlined text-[18px] text-tertiary">
                    upload
                  </span>
                  Upload custom image
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      onBackgroundUpload(e.target.files?.[0] ?? null);
                      e.target.value = "";
                    }}
                  />
                </label>

                {backgroundImage && (
                  <div className="flex flex-col gap-md">
                    <Slider
                      label="Background opacity"
                      value={backgroundOpacity}
                      onChange={setBackgroundOpacity}
                      min={20}
                      max={100}
                      leftHint="Subtle"
                      rightHint="Full"
                    />
                    <div className="flex gap-sm">
                      {(["cover", "contain"] as const).map((fit) => (
                        <button
                          key={fit}
                          type="button"
                          onClick={() => setBackgroundFit(fit)}
                          className={`flex-1 py-sm rounded font-label-sm text-label-sm border transition-colors ${
                            backgroundFit === fit
                              ? "border-tertiary bg-tertiary/10 text-tertiary"
                              : "border-outline-variant/50 text-on-surface-variant hover:border-tertiary/40"
                          }`}
                        >
                          {fit === "cover" ? "Fill canvas" : "Fit inside"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-lg">
            <Slider
              label="Fluidity"
              value={fluidity}
              onChange={setFluidity}
              leftHint="Stiff"
              rightHint="Connected"
            />
            <Slider
              label="Rhythm"
              value={rhythm}
              onChange={setRhythm}
              leftHint="Erratic"
              rightHint="Consistent"
            />
            <Slider
              label="Stroke Pressure"
              value={pressure}
              onChange={setPressure}
              leftHint="Monoline"
              rightHint="Calligraphic"
            />
            <Slider
              label="Slant"
              value={slant}
              onChange={setSlant}
              min={-20}
              max={20}
              leftHint="Back"
              rightHint="Forward"
              unit="°"
            />
            <Slider
              label="Size"
              value={size}
              onChange={setSize}
              min={50}
              max={150}
              leftHint="Small"
              rightHint="Large"
            />
          </div>

          <div className="pt-md border-t border-surface-dim mt-auto flex flex-col gap-sm">
            <button
              type="button"
              onClick={renderFinalInk}
              disabled={busy}
              className="w-full bg-on-surface text-surface py-md rounded-DEFAULT font-label-md text-label-md flex justify-center items-center gap-sm hover:bg-tertiary transition-colors duration-300 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">
                draw
              </span>
              {busy ? "Rendering…" : "Render Final Ink"}
            </button>
            <p className="font-label-sm text-label-sm text-center text-on-surface-variant">
              Uses 1 generation credit
              {authenticated ? ` · You have ${credits}` : " · Sign in required"}
            </p>
            <button
              type="button"
              onClick={saveToCloud}
              disabled={busy}
              className="w-full border border-tertiary text-tertiary py-sm rounded-DEFAULT font-label-md text-label-md hover:bg-tertiary/10 transition-colors disabled:opacity-50"
            >
              Save to Cloud Library
            </button>
            <p className="font-label-sm text-label-sm text-center text-on-surface-variant">
              {currentBase.tier === "premium"
                ? `${CREDIT_COST.SAVE_SIGNATURE} credit · premium template`
                : "Free · free templates"}
              {authenticated ? ` · You have ${credits}` : " · sign in required"}
            </p>
            <button
              type="button"
              onClick={downloadSvg}
              className="w-full border border-tertiary text-tertiary py-sm rounded-DEFAULT font-label-md text-label-md flex justify-center items-center gap-sm hover:bg-tertiary/5 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">
                shape_line
              </span>
              Export SVG (vector)
            </button>
            {statusMsg && (
              <p className="font-label-sm text-label-sm text-center text-on-surface-variant mt-xs">
                {statusMsg}{" "}
                <Link href="/login" className="text-tertiary underline">
                  Sign in
                </Link>
                {" · "}
                <Link href="/pricing" className="text-tertiary underline">
                  Pricing
                </Link>
              </p>
            )}
            {!statusMsg && (
              <p className="font-label-sm text-label-sm text-center text-on-surface-variant mt-xs">
                {rendered
                  ? "Saved to your downloads."
                  : "HD export via server AI"}
              </p>
            )}
          </div>
        </div>
      </aside>
      </div>
    </main>
  );
}

function previewWord(text: string): string {
  const t = text.trim();
  if (!t) return "Signature";
  return t.length > 10 ? t.slice(0, 10) : t;
}

function safeName(text: string): string {
  const t = text.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
  return (t || "signature").toLowerCase() + "-inkflow";
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (url.startsWith("blob:")) setTimeout(() => URL.revokeObjectURL(url), 1000);
}
