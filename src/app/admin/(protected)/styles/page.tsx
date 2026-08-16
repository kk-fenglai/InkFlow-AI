"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AI_PHOTO_STYLES } from "@/lib/ai-photo-styles";
import { fileToDataUrl } from "@/components/admin/adminImage";

interface StyleRow {
  id: string;
  name: string;
  blurb: string;
  prompt: string;
  byteSize: number;
  active: boolean;
  sortOrder: number;
  updatedAt: string;
}

export default function AdminStylesPage() {
  const [styles, setStyles] = useState<StyleRow[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // Upload form
  const [name, setName] = useState("");
  const [blurb, setBlurb] = useState("");
  const [prompt, setPrompt] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBlurb, setEditBlurb] = useState("");
  const [editPrompt, setEditPrompt] = useState("");

  const load = useCallback(() => {
    fetch("/api/admin/styles")
      .then((r) => r.json())
      .then((d) => {
        if (d.styles) setStyles(d.styles);
        else setMsg(d.error ?? "Could not load styles.");
      })
      .catch(() => setMsg("Could not load styles."));
  }, []);

  useEffect(load, [load]);

  async function pickImage(file: File | undefined) {
    if (!file) return;
    try {
      setImageDataUrl(await fileToDataUrl(file));
    } catch {
      setMsg("Could not read that image.");
    }
  }

  async function createStyle() {
    if (!name.trim() || !prompt.trim() || !imageDataUrl || busy) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/styles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, blurb, prompt, image: imageDataUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Upload failed.");
        return;
      }
      setMsg(`Style "${data.style.name}" created — live on the Refine page now.`);
      setName("");
      setBlurb("");
      setPrompt("");
      setImageDataUrl(null);
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch {
      setMsg("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function patchStyle(id: string, patch: Record<string, unknown>) {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/styles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Update failed.");
        return;
      }
      setEditingId(null);
      load();
    } catch {
      setMsg("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteStyle(id: string) {
    const password = window.prompt("Confirm with your admin account password:");
    if (!password) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/styles/${id}`, {
        method: "DELETE",
        headers: { "X-Admin-Password": password },
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Delete failed.");
        return;
      }
      setMsg("Style deleted.");
      load();
    } catch {
      setMsg("Network error.");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(s: StyleRow) {
    setEditingId(s.id);
    setEditName(s.name);
    setEditBlurb(s.blurb);
    setEditPrompt(s.prompt);
  }

  const inputClass =
    "w-full rounded border border-outline-variant/50 bg-surface-container-lowest px-md py-sm font-body-md text-body-md text-on-surface focus:outline-none focus:border-tertiary";

  return (
    <main className="page-main">
      <header className="mb-xl">
        <h1 className="font-headline-md text-headline-md text-on-surface">
          AI Styles
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-sm">
          Uploaded styles appear on the Refine page immediately — no redeploy.
        </p>
      </header>

      {msg && (
        <p className="mb-md font-body-md text-body-md text-on-surface">{msg}</p>
      )}

      {/* Upload form */}
      <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-lg mb-xl">
        <h2 className="font-headline-sm text-headline-sm text-on-surface mb-md">
          Upload a new style
        </h2>
        <div className="grid gap-md md:grid-cols-2">
          <div className="flex flex-col gap-md">
            <label className="block">
              <span className="font-label-md text-label-sm text-on-surface-variant uppercase">
                Name
              </span>
              <input
                className={inputClass}
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Midnight Flourish"
              />
            </label>
            <label className="block">
              <span className="font-label-md text-label-sm text-on-surface-variant uppercase">
                Blurb
              </span>
              <input
                className={inputClass}
                value={blurb}
                maxLength={120}
                onChange={(e) => setBlurb(e.target.value)}
                placeholder="Short picker caption"
              />
            </label>
            <label className="block">
              <span className="font-label-md text-label-sm text-on-surface-variant uppercase">
                Style prompt
              </span>
              <textarea
                className={`${inputClass} min-h-[96px]`}
                value={prompt}
                maxLength={2000}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Handwriting description merged into the generation prompt, e.g. 'sweeping diagonal baseline with a long underline flourish'"
              />
            </label>
          </div>
          <div className="flex flex-col gap-md">
            <label className="block">
              <span className="font-label-md text-label-sm text-on-surface-variant uppercase">
                Reference image
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="block w-full font-body-md text-body-md text-on-surface-variant"
                onChange={(e) => void pickImage(e.target.files?.[0])}
              />
            </label>
            {imageDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageDataUrl}
                alt="Reference preview"
                className="max-h-48 w-auto rounded border border-outline-variant/30 bg-white object-contain"
              />
            )}
            <button
              type="button"
              disabled={busy || !name.trim() || !prompt.trim() || !imageDataUrl}
              onClick={() => void createStyle()}
              className="self-start rounded-full bg-tertiary px-lg py-sm font-label-md text-label-md text-on-tertiary hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Uploading…" : "Upload style"}
            </button>
          </div>
        </div>
      </section>

      {/* Uploaded styles */}
      <section className="mb-xl">
        <h2 className="font-headline-sm text-headline-sm text-on-surface mb-md">
          Uploaded styles ({styles.length})
        </h2>
        {styles.length === 0 ? (
          <p className="font-body-md text-body-md text-on-surface-variant">
            No uploaded styles yet.
          </p>
        ) : (
          <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-3">
            {styles.map((s) => (
              <div
                key={s.id}
                className={`rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-md ${
                  s.active ? "" : "opacity-60"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/ai-styles/image/${s.id}?v=${new Date(s.updatedAt).getTime()}`}
                  alt={s.name}
                  className="h-32 w-full rounded bg-white object-contain border border-outline-variant/20"
                />
                {editingId === s.id ? (
                  <div className="mt-md flex flex-col gap-sm">
                    <input
                      className={inputClass}
                      value={editName}
                      maxLength={60}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <input
                      className={inputClass}
                      value={editBlurb}
                      maxLength={120}
                      onChange={(e) => setEditBlurb(e.target.value)}
                    />
                    <textarea
                      className={`${inputClass} min-h-[72px]`}
                      value={editPrompt}
                      maxLength={2000}
                      onChange={(e) => setEditPrompt(e.target.value)}
                    />
                    <div className="flex gap-md">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void patchStyle(s.id, {
                            name: editName,
                            blurb: editBlurb,
                            prompt: editPrompt,
                          })
                        }
                        className="font-label-sm text-tertiary hover:underline disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="font-label-sm text-on-surface-variant hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mt-md font-label-md text-label-md text-on-surface">
                      {s.name}
                    </p>
                    <p className="font-body-md text-label-sm text-on-surface-variant mt-xs line-clamp-2">
                      {s.blurb || s.prompt}
                    </p>
                    <div className="mt-md flex flex-wrap gap-md">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void patchStyle(s.id, { active: !s.active })}
                        className="font-label-sm text-tertiary hover:underline disabled:opacity-50"
                      >
                        {s.active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => startEdit(s)}
                        className="font-label-sm text-on-surface-variant hover:underline disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void deleteStyle(s.id)}
                        className="font-label-sm text-error hover:underline disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Built-in styles (read-only) */}
      <section>
        <h2 className="font-headline-sm text-headline-sm text-on-surface mb-md">
          Built-in styles ({AI_PHOTO_STYLES.length})
        </h2>
        <p className="font-body-md text-label-sm text-on-surface-variant mb-md">
          Defined in code — read-only here.
        </p>
        <div className="grid gap-md grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
          {AI_PHOTO_STYLES.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.thumb}
                alt={s.name}
                className="h-20 w-full rounded bg-white object-contain"
              />
              <p className="mt-sm font-label-md text-label-sm text-on-surface truncate">
                {s.name}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
