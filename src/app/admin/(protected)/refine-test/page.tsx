"use client";

import { useEffect, useState } from "react";
import { fileToDataUrl } from "@/components/admin/adminImage";

interface CatalogStyle {
  id: string;
  name: string;
}

export default function AdminRefineTestPage() {
  const [mode, setMode] = useState<"redesign" | "style">("redesign");
  const [sourceDataUrl, setSourceDataUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [styleId, setStyleId] = useState("");
  const [styles, setStyles] = useState<CatalogStyle[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/ai-styles")
      .then((r) => r.json())
      .then((d) => {
        if (d.styles) setStyles(d.styles);
      })
      .catch(() => {});
  }, []);

  async function pickImage(file: File | undefined) {
    if (!file) return;
    try {
      setSourceDataUrl(await fileToDataUrl(file));
      setResult(null);
    } catch {
      setMsg("Could not read that image.");
    }
  }

  async function run() {
    if (busy) return;
    if (mode === "redesign" && !sourceDataUrl) return;
    if (mode === "style" && !name.trim()) return;
    setBusy(true);
    setMsg("");
    setResult(null);
    try {
      const body =
        mode === "redesign"
          ? { mode, image: sourceDataUrl }
          : { mode, name, styleId: styleId || undefined };
      const res = await fetch("/api/admin/test-refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Generation failed.");
        return;
      }
      setResult(data.image);
    } catch {
      setMsg("Network error.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded border border-outline-variant/50 bg-surface-container-lowest px-md py-sm font-body-md text-body-md text-on-surface focus:outline-none focus:border-tertiary";

  return (
    <main className="page-main">
      <header className="mb-xl">
        <h1 className="font-headline-md text-headline-md text-on-surface">
          Refine Test
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-sm">
          Internal test of the AI pipeline — no credits are charged, nothing is
          saved.
        </p>
      </header>

      {msg && (
        <p className="mb-md font-body-md text-body-md text-error">{msg}</p>
      )}

      <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-lg mb-xl max-w-2xl">
        <div className="flex gap-md mb-md">
          <button
            type="button"
            onClick={() => setMode("redesign")}
            className={`rounded-full px-lg py-sm font-label-md text-label-md ${
              mode === "redesign"
                ? "bg-tertiary text-on-tertiary"
                : "border border-outline-variant/50 text-on-surface-variant"
            }`}
          >
            Redesign photo
          </button>
          <button
            type="button"
            onClick={() => setMode("style")}
            className={`rounded-full px-lg py-sm font-label-md text-label-md ${
              mode === "style"
                ? "bg-tertiary text-on-tertiary"
                : "border border-outline-variant/50 text-on-surface-variant"
            }`}
          >
            Generate from style
          </button>
        </div>

        {mode === "redesign" ? (
          <div className="flex flex-col gap-md">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="block w-full font-body-md text-body-md text-on-surface-variant"
              onChange={(e) => void pickImage(e.target.files?.[0])}
            />
            <p className="font-body-md text-label-sm text-on-surface-variant">
              Active refine references are attached automatically — test how
              they steer the redesign.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-md">
            <label className="block">
              <span className="font-label-md text-label-sm text-on-surface-variant uppercase">
                Name to sign
              </span>
              <input
                className={inputClass}
                value={name}
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ava Sterling"
              />
            </label>
            <label className="block">
              <span className="font-label-md text-label-sm text-on-surface-variant uppercase">
                Style
              </span>
              <select
                className={inputClass}
                value={styleId}
                onChange={(e) => setStyleId(e.target.value)}
              >
                <option value="">Default</option>
                {styles.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <button
          type="button"
          disabled={
            busy ||
            (mode === "redesign" ? !sourceDataUrl : !name.trim())
          }
          onClick={() => void run()}
          className="mt-md rounded-full bg-tertiary px-lg py-sm font-label-md text-label-md text-on-tertiary hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Generating…" : "Run test"}
        </button>
      </section>

      {(sourceDataUrl || result) && (
        <section className="grid gap-md md:grid-cols-2 max-w-4xl">
          {sourceDataUrl && mode === "redesign" && (
            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-md">
              <p className="font-label-md text-label-sm text-on-surface-variant uppercase mb-sm">
                Input
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sourceDataUrl}
                alt="Test input"
                className="w-full rounded bg-white object-contain"
              />
            </div>
          )}
          {result && (
            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-md">
              <p className="font-label-md text-label-sm text-on-surface-variant uppercase mb-sm">
                Result
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result}
                alt="Test result"
                className="w-full rounded bg-white object-contain"
              />
            </div>
          )}
        </section>
      )}
    </main>
  );
}
