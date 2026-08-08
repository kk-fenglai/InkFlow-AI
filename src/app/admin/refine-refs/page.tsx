"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fileToDataUrl } from "@/components/admin/adminImage";

interface RefRow {
  id: string;
  label: string;
  byteSize: number;
  active: boolean;
  sortOrder: number;
  updatedAt: string;
}

export default function AdminRefineRefsPage() {
  const [refs, setRefs] = useState<RefRow[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const [label, setLabel] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    fetch("/api/admin/refine-refs")
      .then((r) => r.json())
      .then((d) => {
        if (d.refs) setRefs(d.refs);
        else setMsg(d.error ?? "Could not load references.");
      })
      .catch(() => setMsg("Could not load references."));
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

  async function createRef() {
    if (!label.trim() || !imageDataUrl || busy) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/refine-refs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, image: imageDataUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Upload failed.");
        return;
      }
      setMsg(`Reference "${data.ref.label}" uploaded.`);
      setLabel("");
      setImageDataUrl(null);
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch {
      setMsg("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleRef(id: string, active: boolean) {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/refine-refs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) {
        const data = await res.json();
        setMsg(data.error ?? "Update failed.");
        return;
      }
      load();
    } catch {
      setMsg("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteRef(id: string) {
    const password = window.prompt("Confirm with your admin account password:");
    if (!password) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/refine-refs/${id}`, {
        method: "DELETE",
        headers: { "X-Admin-Password": password },
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Delete failed.");
        return;
      }
      setMsg("Reference deleted.");
      load();
    } catch {
      setMsg("Network error.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded border border-outline-variant/50 bg-surface-container-lowest px-md py-sm font-body-md text-body-md text-on-surface focus:outline-none focus:border-tertiary";

  const activeCount = refs.filter((r) => r.active).length;

  return (
    <main className="page-main">
      <header className="mb-xl">
        <h1 className="font-headline-md text-headline-md text-on-surface">
          Refine References
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-sm">
          High-quality signature photos passed to the AI redesign as extra style
          guides. The first 3 active references (by order) are used.
        </p>
      </header>

      {msg && (
        <p className="mb-md font-body-md text-body-md text-on-surface">{msg}</p>
      )}

      <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-lg mb-xl">
        <h2 className="font-headline-sm text-headline-sm text-on-surface mb-md">
          Upload a reference photo
        </h2>
        <div className="flex flex-col gap-md max-w-md">
          <label className="block">
            <span className="font-label-md text-label-sm text-on-surface-variant uppercase">
              Label
            </span>
            <input
              className={inputClass}
              value={label}
              maxLength={60}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Bold executive scrawl"
            />
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="block w-full font-body-md text-body-md text-on-surface-variant"
            onChange={(e) => void pickImage(e.target.files?.[0])}
          />
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
            disabled={busy || !label.trim() || !imageDataUrl}
            onClick={() => void createRef()}
            className="self-start rounded-full bg-tertiary px-lg py-sm font-label-md text-label-md text-on-tertiary hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Uploading…" : "Upload reference"}
          </button>
        </div>
      </section>

      <section>
        <h2 className="font-headline-sm text-headline-sm text-on-surface mb-md">
          References ({activeCount} active / {refs.length})
        </h2>
        {refs.length === 0 ? (
          <p className="font-body-md text-body-md text-on-surface-variant">
            No references yet — the redesign runs on the user photo alone.
          </p>
        ) : (
          <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-3">
            {refs.map((r) => (
              <div
                key={r.id}
                className={`rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-md ${
                  r.active ? "" : "opacity-60"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/admin/refine-refs/${r.id}/image?v=${new Date(r.updatedAt).getTime()}`}
                  alt={r.label}
                  className="h-32 w-full rounded bg-white object-contain border border-outline-variant/20"
                />
                <p className="mt-md font-label-md text-label-md text-on-surface">
                  {r.label}
                </p>
                <p className="font-body-md text-label-sm text-on-surface-variant mt-xs">
                  {(r.byteSize / 1024).toFixed(0)} KB ·{" "}
                  {r.active ? "active" : "inactive"}
                </p>
                <div className="mt-md flex gap-md">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void toggleRef(r.id, !r.active)}
                    className="font-label-sm text-tertiary hover:underline disabled:opacity-50"
                  >
                    {r.active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void deleteRef(r.id)}
                    className="font-label-sm text-error hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
