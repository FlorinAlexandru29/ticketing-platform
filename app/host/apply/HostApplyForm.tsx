"use client";

import { useState } from "react";

type Existing =
  | {
      displayName: string;
      website: string;
      contactEmail: string;
      phone: string;
      verification: "PENDING" | "APPROVED" | "REJECTED";
    }
  | null;

// derive the status type safely from the non-null branch
type Verification = NonNullable<Existing>["verification"] | null;

function normalizeWebsite(raw: string) {
  const v = (raw || "").trim();
  if (!v) return "";
  if (v.includes("@")) return ""; // likely an email pasted by mistake; ignore for website
  // add protocol if it looks like a domain
  if (!/^https?:\/\//i.test(v) && /^[\w.-]+\.[\w.-]+/.test(v)) {
    return "https://" + v;
  }
  return v;
}

export default function HostApplyForm({ existing }: { existing: Existing }) {
  const [displayName, setDisplayName] = useState(existing?.displayName ?? "");
  const [website, setWebsite] = useState(existing?.website ?? "");
  const [contactEmail, setContactEmail] = useState(existing?.contactEmail ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [status, setStatus] = useState<Verification>(existing?.verification ?? null);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function handlesubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrMsg(null);

    try {
      // gentle correction: if an email was pasted into Website, move it to Contact Email if empty
      let w = normalizeWebsite(website);
      let ce = (contactEmail || "").trim();
      if (!ce && website.includes("@")) ce = website.trim();

      const res = await fetch("/api/host/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, website: w, contactEmail: ce, phone }),
      });

      // parse safely
      const ct = res.headers.get("content-type") || "";
      const payload = ct.includes("application/json")
        ? await res.json().catch(() => ({}))
        : { error: await res.text().catch(() => "Unexpected response") };

      if (!res.ok) {
        const msg =
          typeof payload?.error === "string"
            ? payload.error
            : "Failed to submit. Please check your inputs.";
        setErrMsg(msg);
        return;
      }

      setStatus(payload.verification as Verification);
      alert("Application submitted!");
    } catch (e: any) {
      setErrMsg(e?.message || "Network error");
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
            {errMsg && (
              <div className="alert alert-error">
                <span>{errMsg}</span>
              </div>
            )}

            <label className="form-control">
              <span className="label-text">Display Name</span>
              <input
                className="input input-bordered"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </label>

            <label className="form-control">
              <span className="label-text">
                Website <span className="opacity-60">(optional — include http(s)://)</span>
              </span>
              <input
                className="input input-bordered"
                type="url"
                placeholder="https://example.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </label>

            <label className="form-control">
              <span className="label-text">
                Contact Email <span className="opacity-60">(optional)</span>
              </span>
              <input
                className="input input-bordered"
                type="email"
                placeholder="you@example.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </label>

            <label className="form-control">
              <span className="label-text">
                Phone <span className="opacity-60">(optional)</span>
              </span>
              <input
                className="input input-bordered"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
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
