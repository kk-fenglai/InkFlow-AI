"use client";

import { useEffect, useState } from "react";

interface AdminStats {
  users: number;
  purchasesCompleted: number;
  revenueCents: number;
  stylesActive: number;
  refsActive: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.stats) setStats(d.stats);
        else setMsg(d.error ?? "Could not load stats.");
      })
      .catch(() => setMsg("Could not load stats."));
  }, []);

  const cards = stats
    ? [
        { label: "Users", value: String(stats.users) },
        { label: "Completed purchases", value: String(stats.purchasesCompleted) },
        { label: "Revenue", value: `$${(stats.revenueCents / 100).toFixed(2)}` },
        { label: "Active AI styles", value: String(stats.stylesActive) },
        { label: "Refine references", value: String(stats.refsActive) },
      ]
    : [];

  return (
    <main className="page-main">
      <header className="mb-xl">
        <h1 className="font-headline-md text-headline-md text-on-surface">
          Dashboard
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-sm">
          InkFlow platform overview
        </p>
      </header>

      {msg && (
        <p className="mb-md font-body-md text-body-md text-error">{msg}</p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-md">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-md"
          >
            <p className="font-label-md text-label-sm text-on-surface-variant uppercase">
              {c.label}
            </p>
            <p className="font-headline-md text-headline-md text-on-surface mt-sm">
              {c.value}
            </p>
          </div>
        ))}
        {!stats && !msg && (
          <p className="font-body-md text-body-md text-on-surface-variant col-span-full">
            Loading…
          </p>
        )}
      </div>
    </main>
  );
}
