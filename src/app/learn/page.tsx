"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCredits } from "@/hooks/useCredits";
import { CREDIT_COST } from "@/lib/constants";
import {
  deleteCloudSignature,
  fetchCloudSignatures,
  renameCloudSignature,
  saveCloudSignature,
} from "@/lib/signature-api";
import {
  formatSavedAt,
  getStudioDraft,
  type SavedSignature,
  type StudioDraft,
} from "@/lib/signature-library";
import {
  resampleStroke,
  scoreTrace,
  type SignatureStroke,
  type StrokePoint,
} from "@/lib/stroke-data";
import SignatureStrokeVideo from "@/components/SignatureStrokeVideo";
import { useInkLessonAssets } from "@/hooks/useInkLessonAssets";
import { computeStrokeTransform, drawInkPracticeFrame, mapStrokePoint } from "@/lib/stroke-player";

interface TracePt extends StrokePoint {
  t: number;
}

export default function LearnPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const userStrokes = useRef<TracePt[][]>([]);
  const drawing = useRef(false);

  const [library, setLibrary] = useState<SavedSignature[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [strokeIndex, setStrokeIndex] = useState(0);
  const [animProgress, setAnimProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [accuracy, setAccuracy] = useState(0);
  const [rhythm, setRhythm] = useState(0);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [studioDraft, setStudioDraft] = useState<StudioDraft | null>(null);
  const [importName, setImportName] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { authenticated, credits, refresh: refreshCredits } = useCredits();

  const selected = library.find((s) => s.id === selectedId) ?? library[0];
  const { assets: inkAssets, loading: inkLoading } = useInkLessonAssets(
    selected?.strokeData,
  );
  const strokes = useMemo(
    () => inkAssets?.strokes ?? [],
    [inkAssets],
  );
  const inkPathsReady = !!inkAssets && inkAssets.strokes.length > 0;
  const currentStroke: SignatureStroke | undefined = strokes[strokeIndex];

  const refreshLibrary = useCallback(async () => {
    setStudioDraft(getStudioDraft());
    if (!authenticated) {
      setLibrary([]);
      setSelectedId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const result = await fetchCloudSignatures();
    if (result.ok) {
      setLibrary(result.signatures);
      setSelectedId((prev) => {
        if (prev && result.signatures.some((s) => s.id === prev)) return prev;
        return result.signatures[0]?.id ?? null;
      });
    } else {
      setLibrary([]);
      setSaveMsg(result.error ?? "Could not load cloud library.");
    }
    setLoading(false);
  }, [authenticated]);

  useEffect(() => {
    refreshLibrary();
  }, [refreshLibrary]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "inkflow-studio-draft") {
        setStudioDraft(getStudioDraft());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    setStrokeIndex(0);
    setAnimProgress(0);
    userStrokes.current = [];
    setHasDrawn(false);
    setAccuracy(0);
    setRhythm(0);
  }, [selected?.id, inkAssets]);

  useEffect(() => {
    if (selected) setRenameValue(selected.name);
  }, [selected?.id, selected?.name, selected]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selected || !inkAssets) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawInkPracticeFrame(
      ctx,
      w,
      h,
      inkAssets,
      selected.strokeData.width,
      selected.strokeData.height,
      strokeIndex,
      animProgress,
      userStrokes.current,
    );
  }, [selected, inkAssets, strokeIndex, animProgress]);

  useEffect(() => {
    redraw();
    const ro = new ResizeObserver(redraw);
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [redraw]);

  useEffect(() => {
    if (!playing || !currentStroke) return;
    let frame = 0;
    const id = window.setInterval(() => {
      frame += 0.04;
      if (frame >= 1) {
        setAnimProgress(1);
        setPlaying(false);
        window.clearInterval(id);
      } else {
        setAnimProgress(frame);
      }
    }, 40);
    return () => window.clearInterval(id);
  }, [playing, currentStroke, strokeIndex]);

  function pos(e: React.PointerEvent<HTMLCanvasElement>): TracePt {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      t: performance.now(),
    };
  }

  function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!selected || !inkAssets) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    userStrokes.current.push([pos(e)]);
    setHasDrawn(true);
  }

  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const cur = userStrokes.current[userStrokes.current.length - 1];
    cur.push(pos(e));
    redraw();
  }

  function onUp() {
    if (!drawing.current) return;
    drawing.current = false;
    computeScores();
  }

  function computeScores() {
    const canvas = canvasRef.current;
    if (!canvas || !selected || !currentStroke) return;

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const transform = computeStrokeTransform(
      w,
      h,
      selected.strokeData.width,
      selected.strokeData.height,
    );
    const mapPt = (p: StrokePoint) => mapStrokePoint(p, transform);

    const user = userStrokes.current.flat();
    const target = currentStroke.points.map(mapPt);
    const tol = Math.max(w, h) * 0.06;
    setAccuracy(scoreTrace(user, target, tol));

    const speeds: number[] = [];
    for (const stroke of userStrokes.current) {
      for (let i = 1; i < stroke.length; i++) {
        const dt = Math.max(1, stroke[i].t - stroke[i - 1].t);
        speeds.push(
          Math.hypot(stroke[i].x - stroke[i - 1].x, stroke[i].y - stroke[i - 1].y) /
            dt,
        );
      }
    }
    if (speeds.length > 1) {
      const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
      const variance =
        speeds.reduce((a, b) => a + (b - mean) ** 2, 0) / speeds.length;
      const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
      setRhythm(Math.round(Math.max(0, Math.min(1, 1 - cv / 1.6)) * 100));
    }
  }

  function clearTrace() {
    userStrokes.current = [];
    setHasDrawn(false);
    setAccuracy(0);
    setRhythm(0);
    redraw();
  }

  function nextStroke() {
    if (strokeIndex < strokes.length - 1) {
      setStrokeIndex((i) => i + 1);
      setAnimProgress(0);
      clearTrace();
    }
  }

  function prevStroke() {
    if (strokeIndex > 0) {
      setStrokeIndex((i) => i - 1);
      setAnimProgress(0);
      clearTrace();
    }
  }

  function playDemo() {
    setAnimProgress(0);
    setPlaying(true);
  }

  async function handleImportDraft() {
    if (!authenticated) {
      setSaveMsg("Sign in to save signatures to your cloud library.");
      return;
    }
    if (!studioDraft) {
      setSaveMsg("No Studio design found — create one in Studio first.");
      return;
    }

    setSaving(true);
    const name =
      importName.trim() || studioDraft.settings.text.trim() || "My Signature";
    const result = await saveCloudSignature({
      name,
      settings: studioDraft.settings,
      canvasWidth: studioDraft.canvasWidth,
      canvasHeight: studioDraft.canvasHeight,
    });
    setSaving(false);

    if (!result.ok) {
      if (result.code === "INSUFFICIENT_CREDITS") {
        setSaveMsg(
          `Need ${CREDIT_COST.SAVE_SIGNATURE} credit to save (${credits} left).`,
        );
      } else {
        setSaveMsg(result.error ?? "Save failed.");
      }
      return;
    }

    await refreshLibrary();
    if (result.signature) setSelectedId(result.signature.id);
    setStrokeIndex(0);
    clearTrace();
    refreshCredits();
    setSaveMsg(
      `Saved “${result.signature?.name}” to cloud (${result.creditsRemaining} credits left).`,
    );
  }

  async function handleRename() {
    if (!selected) return;
    const result = await renameCloudSignature(selected.id, renameValue);
    if (!result.ok || !result.signature) {
      setSaveMsg(result.error ?? "Enter a valid template name.");
      return;
    }
    await refreshLibrary();
    setSaveMsg(`Renamed to “${result.signature.name}”.`);
  }

  async function handleDuplicateSelected() {
    if (!selected) return;
    if (!authenticated) {
      setSaveMsg("Sign in to duplicate signatures.");
      return;
    }
    setSaving(true);
    const result = await saveCloudSignature({
      name: `${selected.name} (copy)`,
      strokeData: selected.strokeData,
    });
    setSaving(false);

    if (!result.ok) {
      setSaveMsg(result.error ?? "Duplicate failed.");
      return;
    }
    await refreshLibrary();
    if (result.signature) setSelectedId(result.signature.id);
    refreshCredits();
    setSaveMsg(
      `Duplicated as “${result.signature?.name}” (${result.creditsRemaining} credits left).`,
    );
  }

  return (
    <main className="page-main flex flex-col items-center gap-lg sm:gap-xxl">
      <section className="w-full text-center max-w-2xl mx-auto space-y-md">
        <span className="inline-block px-sm py-xs bg-tertiary/10 text-tertiary font-label-sm text-label-sm uppercase tracking-widest rounded border-hairline border-tertiary/20">
          Stroke Video Lessons
        </span>
        <h1 className="font-display-lg text-display-lg-mobile sm:text-display-lg text-on-surface">
          Learn Your Signature
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Watch your saved signature drawn stroke-by-stroke, then practice tracing
          below. Reading and playback are free.
        </p>
      </section>

      {!authenticated && (
        <div className="text-center p-md bg-surface-container-low rounded-lg border border-outline-variant/30 max-w-lg">
          <p className="font-body-md text-body-md text-on-surface-variant mb-sm">
            Sign in to access your cloud signature library.
          </p>
          <Link href="/login" className="text-tertiary underline font-label-md">
            Sign in
          </Link>
        </div>
      )}

      {authenticated && loading ? (
        <p className="font-body-md text-on-surface-variant">Loading library…</p>
      ) : null}

      {authenticated && !loading && library.length === 0 && !studioDraft ? (
        <div className="text-center p-xl bg-surface-container-low rounded-xl border border-outline-variant/30 max-w-lg">
          <p className="font-body-lg text-body-lg text-on-surface-variant mb-md">
            No saved templates yet.
          </p>
          <p className="font-body-md text-body-md text-on-surface-variant mb-lg">
            Design in Studio, then save to cloud ({CREDIT_COST.SAVE_SIGNATURE}{" "}
            credit) to unlock video lessons and practice here.
          </p>
          <Link
            href="/studio"
            className="inline-flex items-center gap-sm px-md py-sm bg-tertiary text-on-tertiary rounded font-label-md"
          >
            Go to Studio
          </Link>
        </div>
      ) : authenticated && !loading ? (
        <section className="w-full grid grid-cols-1 lg:grid-cols-12 gap-lg">
          <div className="lg:col-span-8 bg-surface-container-lowest border-hairline rounded-lg p-md sm:p-lg md:p-xl sketchbook-shadow relative min-h-0 sm:min-h-[420px] flex flex-col">
            <div className="flex flex-wrap items-center gap-sm border-b border-surface-container pb-md mb-lg">
              <label className="font-label-sm text-label-sm text-on-surface-variant">
                Template
              </label>
              <select
                value={selected?.id ?? ""}
                onChange={(e) => {
                  setSelectedId(e.target.value);
                  setStrokeIndex(0);
                  setAnimProgress(0);
                  clearTrace();
                }}
                className="bg-surface-container-low border border-outline-variant rounded px-sm py-xs font-label-md text-label-md"
              >
                {library.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {selected?.strokeData && (
              <div className="mb-lg">
                <p className="font-label-md text-label-md text-on-surface-variant mb-sm">
                  Lesson video — pen follows real stroke order
                </p>
                <SignatureStrokeVideo
                  key={selected.id}
                  strokeData={selected.strokeData}
                  autoPlay
                  loop
                />
              </div>
            )}

            <p className="font-label-md text-label-md text-on-surface mb-sm border-t border-surface-container pt-lg">
              Hands-on practice — trace over your signature
            </p>

            <div className="flex flex-wrap justify-between items-center border-b border-surface-container pb-md mb-lg gap-sm">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Stroke {strokeIndex + 1} / {strokes.length}
              </span>
              <div className="flex gap-xs">
                <button
                  type="button"
                  onClick={prevStroke}
                  disabled={strokeIndex === 0}
                  className="p-xs text-on-surface-variant hover:text-tertiary disabled:opacity-30"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button
                  type="button"
                  onClick={playDemo}
                  className="px-sm py-xs border border-tertiary text-tertiary rounded font-label-sm hover:bg-tertiary/10"
                >
                  Play stroke
                </button>
                <button
                  type="button"
                  onClick={nextStroke}
                  disabled={strokeIndex >= strokes.length - 1}
                  className="p-xs text-on-surface-variant hover:text-tertiary disabled:opacity-30"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
                <button
                  type="button"
                  onClick={clearTrace}
                  className="p-xs text-on-surface-variant hover:text-tertiary"
                >
                  <span className="material-symbols-outlined">ink_eraser</span>
                </button>
              </div>
            </div>

            {currentStroke && (
              <p className="font-label-md text-label-md text-tertiary mb-sm">
                {currentStroke.label}
              </p>
            )}

            <div className="flex-grow relative border border-dashed border-surface-variant rounded bg-surface overflow-hidden min-h-[280px]">
              {inkLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/90">
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    Preparing signature guide…
                  </p>
                </div>
              )}
              {!inkLoading && !inkPathsReady && selected && (
                <div className="absolute inset-0 z-10 flex items-center justify-center p-lg text-center">
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Could not build stroke guide for this template.
                  </p>
                </div>
              )}
              {!selected && (
                <div className="absolute inset-0 flex items-center justify-center p-lg text-center pointer-events-none z-10">
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Save your Studio draft on the right to start practicing.
                  </p>
                </div>
              )}
              <canvas
                ref={canvasRef}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerLeave={onUp}
                className={`absolute inset-0 w-full h-full touch-none ${
                  inkPathsReady ? "cursor-crosshair" : "cursor-not-allowed opacity-50"
                }`}
              />
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-lg">
            {studioDraft && authenticated && (
              <div className="bg-tertiary/5 border border-tertiary/25 rounded-lg p-lg">
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-sm flex items-center gap-xs">
                  <span className="material-symbols-outlined text-tertiary text-[20px]">
                    sync
                  </span>
                  Studio Draft
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant mb-sm">
                  <strong>{studioDraft.settings.text.trim() || "Untitled"}</strong>
                  {" · "}
                  {studioDraft.settings.baseId}
                </p>
                <p className="font-label-sm text-label-sm text-on-surface-variant mb-md">
                  Updated {formatSavedAt(studioDraft.updatedAt)}
                </p>
                <input
                  type="text"
                  value={importName}
                  onChange={(e) => setImportName(e.target.value)}
                  placeholder="Template name (optional)"
                  maxLength={60}
                  className="w-full mb-sm bg-surface-container-lowest border border-outline-variant rounded px-sm py-xs font-body-md text-body-md"
                />
                <button
                  type="button"
                  onClick={handleImportDraft}
                  disabled={saving}
                  className="w-full py-sm bg-tertiary text-on-tertiary rounded font-label-md text-label-md hover:bg-tertiary/90 disabled:opacity-50"
                >
                  {saving
                    ? "Saving…"
                    : `Save to Cloud (${CREDIT_COST.SAVE_SIGNATURE} cr)`}
                </button>
                {!authenticated && (
                  <p className="font-label-sm text-label-sm text-on-surface-variant mt-sm">
                    <Link href="/login" className="text-tertiary underline">
                      Sign in
                    </Link>{" "}
                    required
                  </p>
                )}
              </div>
            )}

            {selected && library.length > 0 && (
              <div className="bg-surface-container-low border-hairline rounded-lg p-lg">
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-md">
                  Template Settings
                </h3>
                <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
                  Name
                </label>
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  maxLength={60}
                  className="w-full mt-xs mb-sm bg-surface-container-lowest border border-outline-variant rounded px-sm py-xs font-body-md"
                />
                <div className="flex gap-sm">
                  <button
                    type="button"
                    onClick={handleRename}
                    className="flex-1 py-xs border border-outline-variant rounded font-label-sm hover:bg-surface-container-high"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={handleDuplicateSelected}
                    disabled={saving}
                    className="flex-1 py-xs border border-outline-variant rounded font-label-sm hover:bg-surface-container-high disabled:opacity-50"
                  >
                    Duplicate ({CREDIT_COST.SAVE_SIGNATURE} cr)
                  </button>
                </div>
              </div>
            )}

            <div className="bg-surface-container-low border-hairline rounded-lg p-lg">
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-md">
                Current Stroke
              </h3>
              <Stat label="Accuracy" value={accuracy} barClass="bg-tertiary" />
              <Stat
                label="Flow &amp; Rhythm"
                value={rhythm}
                barClass="bg-primary"
              />
              <p className="font-label-sm text-label-sm text-on-surface-variant mt-md">
                {hasDrawn
                  ? feedback(accuracy, rhythm)
                  : "Follow the dotted pen path on top of the faded signature."}
              </p>
            </div>

            <div className="bg-surface-container-low border-hairline rounded-lg p-lg">
              <div className="flex justify-between items-center mb-md">
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  Cloud Library
                </h3>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {library.length}/50
                </span>
              </div>
              {library.length === 0 ? (
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Save your Studio draft to cloud to start practicing.
                </p>
              ) : (
              <ul className="space-y-sm max-h-48 overflow-y-auto">
                {library.map((s) => (
                  <li
                    key={s.id}
                    className="flex justify-between items-center gap-sm font-label-sm text-label-sm"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(s.id);
                        setStrokeIndex(0);
                        clearTrace();
                      }}
                      className={`text-left truncate ${
                        s.id === selected?.id
                          ? "text-tertiary"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      <span className="block truncate">{s.name}</span>
                      <span className="block text-on-surface-variant/70 text-[11px]">
                        {formatSavedAt(s.savedAt)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const result = await deleteCloudSignature(s.id);
                        if (!result.ok) {
                          setSaveMsg(result.error ?? "Delete failed.");
                          return;
                        }
                        await refreshLibrary();
                        setSaveMsg(`Removed “${s.name}”.`);
                      }}
                      className="text-outline hover:text-error shrink-0"
                      aria-label={`Remove ${s.name}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        delete
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              )}
            </div>

            {saveMsg && (
              <p className="font-label-sm text-label-sm text-tertiary text-center">
                {saveMsg}
              </p>
            )}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function Stat({
  label,
  value,
  barClass,
}: {
  label: string;
  value: number;
  barClass: string;
}) {
  return (
    <div className="mb-md">
      <div className="flex justify-between font-label-md text-label-md mb-xs">
        <span
          className="text-on-surface-variant"
          dangerouslySetInnerHTML={{ __html: label }}
        />
        <span className="text-on-surface font-headline-sm text-lg">
          {value}%
        </span>
      </div>
      <div className="w-full bg-surface-container h-1 rounded-full overflow-hidden">
        <div
          className={`${barClass} h-full rounded-full transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function feedback(acc: number, rhy: number): string {
  if (acc >= 85 && rhy >= 80) return "Masterful. Your mark flows with confidence.";
  if (acc >= 70) return "Strong tracing — smooth the pace for a steadier rhythm.";
  if (acc >= 40) return "Good start. Slow down and hug the dotted guide.";
  return "Keep tracing the dotted line to build muscle memory.";
}
