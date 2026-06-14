"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface PurchaseRow {
  id: string;
  user: { email: string; name: string | null };
  credits: number;
  amountCents: number;
  status: string;
  purchaseType: string;
  refundedCents: number;
  createdAt: string;
}

export default function AdminPurchasesPage() {
  const { data: session } = useSession();
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/purchases")
      .then((r) => r.json())
      .then((d) => {
        if (d.purchases) setPurchases(d.purchases);
      })
      .catch(() => setMsg("Could not load purchases."));
  }, []);

  async function refund(id: string) {
    const password = window.prompt("Confirm with your admin account password:");
    if (!password) return;

    setBusyId(id);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/purchases/${id}/refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Password": password,
        },
        body: JSON.stringify({ reason: "admin_refund" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Refund failed.");
        return;
      }
      setMsg(`Refund issued (${data.refundId}).`);
      const list = await fetch("/api/admin/purchases").then((r) => r.json());
      if (list.purchases) setPurchases(list.purchases);
    } catch {
      setMsg("Network error.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="page-main">
      <header className="flex flex-wrap justify-between items-center gap-md mb-xl">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface">
            Admin — Payments
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-sm">
            Signed in as {session?.user?.email}
          </p>
        </div>
        <Link href="/account" className="text-tertiary underline font-label-md">
          Back to account
        </Link>
      </header>

      {msg && (
        <p className="mb-md font-body-md text-body-md text-on-surface">{msg}</p>
      )}

      <div className="overflow-x-auto rounded-xl border border-outline-variant/30">
        <table className="w-full font-body-md text-body-md">
          <thead className="bg-surface-container-low text-left">
            <tr>
              <th className="p-sm">User</th>
              <th className="p-sm">Type</th>
              <th className="p-sm">Amount</th>
              <th className="p-sm">Status</th>
              <th className="p-sm">Action</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.id} className="border-t border-outline-variant/20">
                <td className="p-sm">{p.user.email}</td>
                <td className="p-sm">{p.purchaseType}</td>
                <td className="p-sm">
                  ${(p.amountCents / 100).toFixed(2)} · {p.credits} cr
                </td>
                <td className="p-sm uppercase text-label-sm">{p.status}</td>
                <td className="p-sm">
                  {p.status === "completed" && (
                    <button
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => void refund(p.id)}
                      className="text-error font-label-sm hover:underline disabled:opacity-50"
                    >
                      {busyId === p.id ? "Refunding…" : "Refund"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
