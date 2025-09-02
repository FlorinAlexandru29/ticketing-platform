'use client';

import { useState } from "react";

type Row = {
  userId: string;
  displayName: string;
  contactEmail: string | null;
  website: string | null;
  phone: string | null;
  verification: "PENDING"|"APPROVED"|"REJECTED";
  user: { email: string | null; name: string | null };
};

export default function HostApprovals({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function setStatus(userId: string, status: "APPROVED"|"REJECTED") {
    setBusy(userId);
    try {
      const r = await fetch(`/api/admin/hosts/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error("Failed");
      setRows(prev => prev.map(x => x.userId === userId ? { ...x, verification: status } : x));
      if (status === "APPROVED") {
        // optional: remove from list
        setRows(prev => prev.filter(x => x.userId !== userId));
      }
    } catch {
      alert("Update failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra">
        <thead>
          <tr>
            <th>User</th><th>Display</th><th>Contact</th><th>Website</th><th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.userId}>
              <td className="flex flex-col gap-2 whitespace-pre-wrap text-sm">
                {r.user.name || "—"} ({r.user.email || "—"})
                <span className={`badge ${r.verification==="APPROVED"?"badge-success":r.verification==="REJECTED"?"badge-error":"badge-warning"}`}>
                  {r.verification}
                </span>
              </td>
              <td>{r.displayName}</td>
              <td>
                <div className="grid grid-rows">
                <p>Email</p>
                <p>Website</p>
                <p>Phone</p>
                
                </div>
              </td>
              <td>
                <div className="grid grid-rows">
                <p>{r.contactEmail || "—"}</p>
                <p>{r.website ? <a className="link" href={r.website} target="_blank">{r.website}</a> : "—"}</p>
                <p>{r.phone || "—"}</p>
                </div>
              </td>
              <td className="flex flex-col gap-2">
                <button className="btn btn-xs btn-success" disabled={busy===r.userId} onClick={()=>setStatus(r.userId,"APPROVED")}>Approve</button>
                <button className="btn btn-xs btn-error" disabled={busy===r.userId} onClick={()=>setStatus(r.userId,"REJECTED")}>Reject</button>
              </td>
            </tr>
          ))}
          {rows.length===0 && (
            <tr><td colSpan={7}><div className="alert alert-info">No pending or rejected applications.</div></td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
