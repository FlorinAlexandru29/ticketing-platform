'use client';

import { useEffect, useMemo, useState } from "react";

type Row = {
  id: string;
  email: string | null;
  name: string | null;
  role: "USER" | "HOST" | "ADMIN";
};

export default function UsersClient() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);

  // Load full list once
  useEffect(() => {
    let alive = true;
    (async () => {
      setBusy(true);
      try {
        const r = await fetch(`/api/admin/users`, { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        setRows(Array.isArray(j.items) ? j.items : []);
      } catch {
        if (!alive) return;
        setRows([]);
      } finally {
        if (alive) setBusy(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Client-side filter
  const filtered = useMemo(() => {
    if (!rows) return null;
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(u => {
      const email = (u.email ?? "").toLowerCase();
      const name  = (u.name  ?? "").toLowerCase();
      const role  = (u.role  ?? "").toString().toLowerCase();
      return email.includes(needle) || name.includes(needle) || role.includes(needle);
    });
  }, [rows, q]);

  async function del(id: string) {
    if (!confirm("Delete this user? This removes their events and tickets.")) return;
    if (!rows) return;
    const prev = rows;
    setRows(prev.filter(x => x.id !== id));
    try {
      const r = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
    } catch {
      // revert on failure
      setRows(prev);
      alert("Failed to delete user.");
    }
  }

  return (
    <div className="space-y-4">
      {/* Header / filters */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="join">
          <input
            className="input input-bordered join-item"
            placeholder="Filter by email, name or role…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          {!!q && (
            <button className="btn join-item" onClick={() => setQ("")}>Clear</button>
          )}
        </div>
        <div className="text-sm opacity-70">
          {busy && "Loading…"}
          {!busy && rows && (
            <>
              Total: <span className="font-medium">{rows.length}</span>&nbsp;·&nbsp;
              Showing: <span className="font-medium">{filtered?.length ?? 0}</span>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th className="w-0"></th>
            </tr>
          </thead>

          <tbody>
            {busy && !rows && (
              <tr><td colSpan={4}><div className="alert">Loading users…</div></td></tr>
            )}

            {!busy && filtered && filtered.length === 0 && (
              <tr><td colSpan={4}><div className="alert alert-info">No users match your filter.</div></td></tr>
            )}

            {!busy && filtered && filtered.map(u => (
              <tr key={u.id}>
                <td className="truncate max-w-64">{u.email || "—"}</td>
                <td className="truncate max-w-48">{u.name || "—"}</td>
                <td>
                  <span
                    className={`badge ${u.role === "ADMIN" ? "badge-error"
                      : u.role === "HOST" ? "badge-info"
                      : "badge-ghost"}`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="text-right">
                  <button className="btn btn-xs btn-error" onClick={() => del(u.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>
    </div>
  );
}
