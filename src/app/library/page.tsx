"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import CloudSignaturePreview from "@/components/CloudSignaturePreview";
import { useCredits } from "@/hooks/useCredits";
import { CREDIT_COST } from "@/lib/constants";
import {
  deleteCloudSignature,
  fetchCloudSignatures,
  renameCloudSignature,
} from "@/lib/signature-api";
import { formatSavedAt, type SavedSignature } from "@/lib/signature-library";

const MAX_SIGNATURES = 50;

export default function CloudLibraryPage() {
  const { authenticated } = useCredits();
  const [library, setLibrary] = useState<SavedSignature[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [renameValue, setRenameValue] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const selected =
    library.find((s) => s.id === selectedId) ?? library[0] ?? null;

  const refreshLibrary = useCallback(async () => {
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
      setMsg("");
    } else {
      setLibrary([]);
      setSelectedId(null);
      setMsg(result.error ?? "Could not load cloud library.");
    }
    setLoading(false);
  }, [authenticated]);

  useEffect(() => {
    void refreshLibrary();
  }, [refreshLibrary]);

  useEffect(() => {
    setRenameValue(selected?.name ?? "");
  }, [selected?.id, selected?.name]);

  async function handleRename() {
    if (!selected) return;
    setBusy(true);
    const result = await renameCloudSignature(selected.id, renameValue);
    setBusy(false);
    if (!result.ok) {
      setMsg(result.error ?? "Rename failed.");
      return;
    }
    await refreshLibrary();
    setMsg(`Renamed to “${result.signature?.name}”.`);
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete “${name}” from your cloud library?`)) return;
    setBusy(true);
    const result = await deleteCloudSignature(id);
    setBusy(false);
    if (!result.ok) {
      setMsg(result.error ?? "Delete failed.");
      return;
    }
    await refreshLibrary();
    setMsg(`Removed “${name}”.`);
  }

  return (
    <main className="page-main">
      <header className="max-w-3xl mb-xl">
        <span className="inline-block px-sm py-xs bg-tertiary/10 text-tertiary font-label-sm text-label-sm uppercase tracking-widest rounded border border-tertiary/20 mb-md">
          Cloud Library
        </span>
        <h1 className="font-display-lg text-display-lg text-on-surface mb-md">
          Your Signature Library
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          View and manage signatures saved to the cloud. Use them for PDF
          signing or stroke-by-stroke practice. Saving costs{" "}
          {CREDIT_COST.SAVE_SIGNATURE} credit each; browsing is free.
        </p>
      </header>

      {!authenticated && (
        <div className="mb-xl p-xl bg-surface-container border border-outline-variant/30 rounded-xl text-center max-w-lg">
          <span className="material-symbols-outlined text-tertiary text-[40px] mb-md block">
            cloud
          </span>
          <p className="font-body-md text-body-md text-on-surface-variant mb-md">
            Sign in to view your cloud signature library.
          </p>
          <Link
            href="/login?callbackUrl=/library"
            className="inline-block px-lg py-md bg-tertiary text-on-tertiary rounded font-label-md"
          >
            Sign in
          </Link>
        </div>
      )}

      {authenticated && loading && (
        <p className="font-body-md text-on-surface-variant">Loading library…</p>
      )}

      {authenticated && !loading && library.length === 0 && (
        <div className="text-center p-xl bg-surface-container-low rounded-xl border border-outline-variant/30 max-w-lg">
          <span className="material-symbols-outlined text-on-surface-variant/50 text-[48px] mb-md block">
            inventory_2
          </span>
          <p className="font-body-lg text-body-lg text-on-surface-variant mb-md">
            No cloud signatures yet.
          </p>
          <p className="font-body-md text-body-md text-on-surface-variant mb-lg">
            Design a signature in Studio, then save it to the cloud (
            {CREDIT_COST.SAVE_SIGNATURE} credit).
          </p>
          <Link
            href="/studio"
            className="inline-flex items-center gap-sm px-md py-sm bg-tertiary text-on-tertiary rounded font-label-md"
          >
            Go to Studio
          </Link>
        </div>
      )}

      {authenticated && !loading && library.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
          <section className="lg:col-span-8">
            <div className="flex items-center justify-between mb-md">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">
                All signatures
              </h2>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {library.length}/{MAX_SIGNATURES}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-md">
              {library.map((sig) => {
                const active = sig.id === selected?.id;
                return (
                  <button
                    key={sig.id}
                    type="button"
                    onClick={() => setSelectedId(sig.id)}
                    className={`text-left rounded-xl border p-md transition-colors ${
                      active
                        ? "border-tertiary bg-tertiary/5 shadow-sm"
                        : "border-outline-variant/30 bg-surface-container-lowest hover:border-tertiary/40"
                    }`}
                  >
                    <div className="aspect-[5/2] rounded-lg bg-surface border border-outline-variant/20 flex items-center justify-center overflow-hidden mb-sm px-sm">
                      <CloudSignaturePreview
                        signature={sig}
                        className="max-h-full max-w-full w-full h-full"
                      />
                    </div>
                    <p className="font-label-md text-label-md text-on-surface truncate">
                      {sig.name}
                    </p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant mt-xs">
                      {formatSavedAt(sig.savedAt)}
                    </p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant/70 mt-xs truncate">
                      {sig.strokeData.settings.text || "—"} ·{" "}
                      {sig.strokeData.settings.baseId}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="lg:col-span-4 space-y-lg">
            {selected && (
              <>
                <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-lg">
                  <h2 className="font-headline-sm text-headline-sm text-on-surface mb-md">
                    Preview
                  </h2>
                  <div className="aspect-[5/2] rounded-lg bg-surface border border-outline-variant/20 flex items-center justify-center overflow-hidden px-md mb-md">
                    <CloudSignaturePreview
                      signature={selected}
                      className="max-h-full max-w-full w-full h-full"
                    />
                  </div>
                  <dl className="space-y-sm font-label-sm text-label-sm">
                    <div className="flex justify-between gap-sm">
                      <dt className="text-on-surface-variant">Text</dt>
                      <dd className="text-on-surface truncate">
                        {selected.strokeData.settings.text || "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-sm">
                      <dt className="text-on-surface-variant">Template</dt>
                      <dd className="text-on-surface">
                        {selected.strokeData.settings.baseId}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-sm">
                      <dt className="text-on-surface-variant">Saved</dt>
                      <dd className="text-on-surface">
                        {formatSavedAt(selected.savedAt)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-sm">
                      <dt className="text-on-surface-variant">Strokes</dt>
                      <dd className="text-on-surface">
                        {selected.strokeData.strokes.length}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-lg">
                  <h2 className="font-headline-sm text-headline-sm text-on-surface mb-md">
                    Actions
                  </h2>
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
                  <button
                    type="button"
                    onClick={() => void handleRename()}
                    disabled={busy || !renameValue.trim()}
                    className="w-full py-sm mb-sm border border-outline-variant rounded font-label-md hover:bg-surface-container-high disabled:opacity-50"
                  >
                    Rename
                  </button>
                  <Link
                    href="/sign"
                    className="block w-full py-sm mb-sm text-center bg-tertiary text-on-tertiary rounded font-label-md hover:bg-tertiary/90"
                  >
                    Sign PDF
                  </Link>
                  <Link
                    href="/learn"
                    className="block w-full py-sm mb-sm text-center border border-tertiary text-tertiary rounded font-label-md hover:bg-tertiary/10"
                  >
                    Practice in Learning
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleDelete(selected.id, selected.name)}
                    disabled={busy}
                    className="w-full py-sm text-error border border-error/30 rounded font-label-md hover:bg-error/5 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}

            <div className="bg-tertiary/5 border border-tertiary/20 rounded-xl p-lg">
              <p className="font-body-md text-body-md text-on-surface-variant mb-md">
                Save new signatures from{" "}
                <Link href="/studio" className="text-tertiary underline">
                  Studio
                </Link>{" "}
                ({CREDIT_COST.SAVE_SIGNATURE} credit each).
              </p>
              <Link
                href="/studio"
                className="inline-flex items-center gap-xs font-label-md text-tertiary hover:underline"
              >
                <span className="material-symbols-outlined text-[18px]">
                  add
                </span>
                Create new signature
              </Link>
            </div>
          </aside>
        </div>
      )}

      {msg && (
        <p className="font-body-md text-body-md text-on-surface-variant text-center mt-xl">
          {msg}
        </p>
      )}
    </main>
  );
}
