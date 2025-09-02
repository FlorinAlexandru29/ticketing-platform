"use client";

import { useState } from "react";

export default function HostApplyForm({ existing }: {
  existing: { displayName: string ; website: string; contactEmail: string; phone: string; verification: "PENDING" | "APPROVED" | "REJECTED" } | null
}) {
  const [displayName, setDisplayName] = useState(existing?.displayName ?? "");
  const [website, setWebsite] = useState(existing?.website ?? "");
  const [contactEmail, setContactEmail] = useState(existing?.contactEmail ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [status, setStatus] = useState(existing?.verification ?? null);
  const [loading, setLoading] = useState(false);

  async function handlesubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/host/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, website, contactEmail, phone }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Failed to submit");
      setStatus(j.verification);
      alert("Application submitted!");
    } catch (e:any) {
      alert(e.message || "Failed to submit");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-box border border-base-300 bg-base-200 p-4">
      {status && status !== "APPROVED" ? (
        <div className={`alert ${status === "PENDING" ? "alert-warning" : "alert-error"} mb-4`}>
          <span>Status: {status}</span>
        </div>
      ) : (
      <form onSubmit={handlesubmit}>
      <div className="grid grid-cols-1 gap-3">
        <label className="form-control">
          <span className="label-text">Display Name</span>
          <input className="input input-bordered" required value={displayName} onChange={e=>setDisplayName(e.target.value)} />
        </label>
        <label className="form-control">
          <span className="label-text">Website</span>
          <input className="input input-bordered" required value={website} onChange={e=>setWebsite(e.target.value)} />
        </label>
        <label className="form-control">
          <span className="label-text">Contact Email</span>
          <input className="input input-bordered" required type="email" value={contactEmail} onChange={e=>setContactEmail(e.target.value)} />
        </label>
        <label className="form-control">
          <span className="label-text">Phone</span>
          <input className="input input-bordered" required value={phone} onChange={e=>setPhone(e.target.value)} />
        </label>
      </div>
      <div className="mt-4">
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Submitting…" : "Submit Application"}
        </button>
      </div>
      </form>
      )}
    </section>
  );
}
