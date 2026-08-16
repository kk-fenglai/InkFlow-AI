"use client";

import { useEffect, useState } from "react";

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  credits: number;
  plan: string;
  role: string;
  subscriptionEnd: string | null;
  createdAt: string;
}

interface LoginEventRow {
  id: string;
  source: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [msg, setMsg] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => {
        if (d.users) setUsers(d.users);
        else setMsg(d.error ?? "Could not load users.");
      })
      .catch(() => setMsg("Could not load users."));
  }, []);

  function patchUser(updated: UserRow) {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  }

  function removeUser(id: string) {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setExpandedId(null);
  }

  return (
    <main className="page-main">
      <header className="mb-xl">
        <h1 className="font-headline-md text-headline-md text-on-surface">
          Users
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-sm">
          Latest 100 registered accounts
        </p>
      </header>

      {msg && (
        <p className="mb-md font-body-md text-body-md text-error">{msg}</p>
      )}

      <div className="overflow-x-auto rounded-xl border border-outline-variant/30">
        <table className="w-full font-body-md text-body-md">
          <thead className="bg-surface-container-low text-left">
            <tr>
              <th className="p-sm">Email</th>
              <th className="p-sm">Name</th>
              <th className="p-sm">Credits</th>
              <th className="p-sm">Plan</th>
              <th className="p-sm">Role</th>
              <th className="p-sm">Joined</th>
              <th className="p-sm" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserTableRow
                key={u.id}
                user={u}
                expanded={expandedId === u.id}
                onToggle={() =>
                  setExpandedId((cur) => (cur === u.id ? null : u.id))
                }
                onPatched={patchUser}
                onDeleted={() => removeUser(u.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function UserTableRow({
  user,
  expanded,
  onToggle,
  onPatched,
  onDeleted,
}: {
  user: UserRow;
  expanded: boolean;
  onToggle: () => void;
  onPatched: (u: UserRow) => void;
  onDeleted: () => void;
}) {
  return (
    <>
      <tr className="border-t border-outline-variant/20">
        <td className="p-sm">{user.email}</td>
        <td className="p-sm">{user.name ?? "—"}</td>
        <td className="p-sm">{user.credits}</td>
        <td className="p-sm uppercase text-label-sm">{user.plan}</td>
        <td className="p-sm uppercase text-label-sm">
          <span className={user.role === "admin" ? "text-tertiary" : ""}>
            {user.role}
          </span>
        </td>
        <td className="p-sm">
          {new Date(user.createdAt).toLocaleDateString()}
        </td>
        <td className="p-sm text-right">
          <button
            type="button"
            onClick={onToggle}
            className="font-label-sm text-label-sm text-tertiary hover:underline whitespace-nowrap"
          >
            {expanded ? "Close" : "Manage"}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-t border-outline-variant/20 bg-surface-container-lowest">
          <td colSpan={7} className="p-md">
            <UserManagePanel
              user={user}
              onPatched={onPatched}
              onDeleted={onDeleted}
            />
          </td>
        </tr>
      )}
    </>
  );
}

function UserManagePanel({
  user,
  onPatched,
  onDeleted,
}: {
  user: UserRow;
  onPatched: (u: UserRow) => void;
  onDeleted: () => void;
}) {
  return (
    <div className="grid gap-lg md:grid-cols-3">
      <LoginHistory userId={user.id} />
      <UpgradeControls user={user} onPatched={onPatched} />
      <DeleteControls user={user} onDeleted={onDeleted} />
    </div>
  );
}

function LoginHistory({ userId }: { userId: string }) {
  const [logins, setLogins] = useState<LoginEventRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/users/${userId}/logins`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.logins) setLogins(d.logins);
        else setError(d.error ?? "Could not load login history.");
      })
      .catch(() => !cancelled && setError("Could not load login history."));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <section>
      <h3 className="font-label-md text-label-sm text-on-surface-variant uppercase tracking-widest mb-sm">
        Login history
      </h3>
      {error && <p className="font-body-md text-body-md text-error">{error}</p>}
      {!error && logins === null && (
        <p className="font-body-md text-body-md text-on-surface-variant">
          Loading…
        </p>
      )}
      {logins !== null && logins.length === 0 && (
        <p className="font-body-md text-body-md text-on-surface-variant">
          No sign-ins recorded yet.
        </p>
      )}
      {logins !== null && logins.length > 0 && (
        <ul className="flex flex-col gap-xs max-h-64 overflow-y-auto">
          {logins.map((l) => (
            <li
              key={l.id}
              className="font-body-md text-label-sm text-on-surface border-b border-outline-variant/10 pb-xs"
            >
              <span className="text-on-surface">
                {new Date(l.createdAt).toLocaleString()}
              </span>
              <span className="text-on-surface-variant">
                {" · "}
                {l.source}
                {l.ip ? ` · ${l.ip}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function UpgradeControls({
  user,
  onPatched,
}: {
  user: UserRow;
  onPatched: (u: UserRow) => void;
}) {
  const [credits, setCredits] = useState("");
  const [days, setDays] = useState("30");
  const [busy, setBusy] = useState<"" | "plan" | "credits">("");
  const [note, setNote] = useState("");

  async function send(payload: Record<string, unknown>, which: "plan" | "credits") {
    setBusy(which);
    setNote("");
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) {
        setNote(d.error ?? "Action failed.");
      } else if (d.user) {
        onPatched(d.user);
        setNote("Saved.");
        if (which === "credits") setCredits("");
      }
    } catch {
      setNote("Network error.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="flex flex-col gap-sm">
      <h3 className="font-label-md text-label-sm text-on-surface-variant uppercase tracking-widest">
        Plan & credits
      </h3>

      <div className="flex items-end gap-sm">
        <label className="flex flex-col gap-xs">
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            Pro for (days)
          </span>
          <input
            type="number"
            min={1}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="w-24 bg-surface-container-lowest border-b-2 border-outline-variant focus:border-tertiary outline-none px-sm py-xs font-body-md"
          />
        </label>
        <button
          type="button"
          disabled={busy !== ""}
          onClick={() =>
            send({ plan: "pro", planDays: Number(days) || 30 }, "plan")
          }
          className="bg-on-surface text-surface px-md py-xs rounded font-label-sm text-label-sm hover:bg-tertiary transition-colors disabled:opacity-50"
        >
          Upgrade to Pro
        </button>
      </div>

      {user.plan !== "free" && (
        <button
          type="button"
          disabled={busy !== ""}
          onClick={() => send({ plan: "free" }, "plan")}
          className="self-start font-label-sm text-label-sm text-tertiary hover:underline disabled:opacity-50"
        >
          Downgrade to Free
        </button>
      )}

      <div className="flex items-end gap-sm">
        <label className="flex flex-col gap-xs">
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            Grant credits
          </span>
          <input
            type="number"
            min={1}
            value={credits}
            onChange={(e) => setCredits(e.target.value)}
            className="w-24 bg-surface-container-lowest border-b-2 border-outline-variant focus:border-tertiary outline-none px-sm py-xs font-body-md"
          />
        </label>
        <button
          type="button"
          disabled={busy !== "" || !credits || Number(credits) <= 0}
          onClick={() => send({ grantCredits: Number(credits) }, "credits")}
          className="border border-outline-variant px-md py-xs rounded font-label-sm text-label-sm hover:border-tertiary hover:text-tertiary transition-colors disabled:opacity-50"
        >
          Grant
        </button>
      </div>

      <p className="font-body-md text-label-sm text-on-surface-variant">
        {user.subscriptionEnd
          ? `Pro until ${new Date(user.subscriptionEnd).toLocaleDateString()}`
          : "No active subscription"}
      </p>
      {note && (
        <p className="font-body-md text-label-sm text-on-surface-variant">
          {note}
        </p>
      )}
    </section>
  );
}

function DeleteControls({
  user,
  onDeleted,
}: {
  user: UserRow;
  onDeleted: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = user.role === "admin";

  async function doDelete() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
        headers: { "X-Admin-Password": password },
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "Delete failed.");
        setBusy(false);
        return;
      }
      onDeleted();
    } catch {
      setError("Network error.");
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-sm">
      <h3 className="font-label-md text-label-sm text-on-surface-variant uppercase tracking-widest">
        Danger zone
      </h3>
      {isAdmin ? (
        <p className="font-body-md text-label-sm text-on-surface-variant">
          Admin accounts cannot be deleted here.
        </p>
      ) : !confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="self-start border border-error/50 text-error px-md py-xs rounded font-label-sm text-label-sm hover:bg-error/10 transition-colors"
        >
          Delete user
        </button>
      ) : (
        <div className="flex flex-col gap-sm">
          <p className="font-body-md text-label-sm text-error">
            Permanently deletes {user.email} and all their data. Enter your admin
            password to confirm.
          </p>
          <input
            type="password"
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            className="w-full bg-surface-container-lowest border-b-2 border-outline-variant focus:border-error outline-none px-sm py-xs font-body-md"
          />
          {error && (
            <p className="font-body-md text-label-sm text-error">{error}</p>
          )}
          <div className="flex gap-sm">
            <button
              type="button"
              disabled={busy || !password}
              onClick={doDelete}
              className="bg-error text-surface px-md py-xs rounded font-label-sm text-label-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {busy ? "Deleting…" : "Confirm delete"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setConfirming(false);
                setPassword("");
                setError("");
              }}
              className="font-label-sm text-label-sm text-on-surface-variant hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
