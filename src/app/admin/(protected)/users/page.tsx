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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => {
        if (d.users) setUsers(d.users);
        else setMsg(d.error ?? "Could not load users.");
      })
      .catch(() => setMsg("Could not load users."));
  }, []);

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
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-outline-variant/20">
                <td className="p-sm">{u.email}</td>
                <td className="p-sm">{u.name ?? "—"}</td>
                <td className="p-sm">{u.credits}</td>
                <td className="p-sm uppercase text-label-sm">{u.plan}</td>
                <td className="p-sm uppercase text-label-sm">
                  <span className={u.role === "admin" ? "text-tertiary" : ""}>
                    {u.role}
                  </span>
                </td>
                <td className="p-sm">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
