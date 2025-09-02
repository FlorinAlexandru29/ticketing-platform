"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRScanner from "@/components/host/QRScanner";

type EventLite = { id: string; title: string; startAt: string };

type VerifyResult =
  | { kind: "ok"; message: string }
  | { kind: "warn"; message: string }
  | { kind: "error"; message: string }
  | null;

export default function VerifyClient() {
  const [events, setEvents] = useState<EventLite[]>([]);
  const [eventId, setEventId] = useState<string>("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VerifyResult>(null);

  // cool-down to prevent double submissions from continuous camera decoding
  const lockRef = useRef(false);
  const cooldownMs = 1200;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/host/my-events?upcoming=1", { cache: "no-store" });
        const j = await res.json();
        if (Array.isArray(j.items)) setEvents(j.items);
      } catch {
        // ignore
      }
    })();
  }, []);

  async function verify(input: string) {
    if (!eventId || !input || busy) return;

    setBusy(true);
    setResult(null);
    try {
      const r = await fetch("/api/tickets/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, code: input.trim() }),
      });
      const j = await r.json().catch(() => ({}));

      if (!r.ok) {
        setResult({ kind: "error", message: j?.error || "Verify failed" });
        return;
      }

      // server returns { status: "validated" | "already" | "wrong_event" | "not_found", message }
      switch (j.status) {
        case "validated":
          setResult({ kind: "ok", message: j.message || "Ticket was validated." });
          break;
        case "already":
          setResult({ kind: "warn", message: j.message || "Ticket was already validated." });
          break;
        case "wrong_event":
          setResult({ kind: "error", message: j.message || "Ticket not valid for this event." });
          break;
        case "not_found":
          setResult({ kind: "error", message: j.message || "Ticket does not exist." });
          break;
        default:
          setResult({ kind: "error", message: j.message || "Error reading ticket" });
      }
    } catch (e: any) {
      setResult({ kind: "error", message: e?.message || "Error reading ticket" });
    } finally {
      setBusy(false);
      setTimeout(() => (lockRef.current = false), cooldownMs);
    }
  }

  const resultClass = useMemo(() => {
    if (!result) return "alert";
    return result.kind === "ok"
      ? "alert-success"
      : result.kind === "warn"
      ? "alert-warning"
      : "alert-error";
  }, [result]);

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-2xl font-bold">Verify Tickets</h1>

      <div className="flex gap-4 flex-wrap items-end">
        <div className="form-control min-w-64">
          <label className="label"><span className="label-text">Event</span></label>
          <select
            className="select select-bordered"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
          >
            <option value="">— Select —</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title} — {new Date(e.startAt).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>

        <div className="form-control">
          <label className="label"><span className="label-text">Ticket Code</span></label>
          <div className="join">
            <input
              className="input input-bordered join-item"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="TCKT-XXXX or Ticket ID"
            />
            <button
              className="btn btn-primary join-item"
              disabled={!eventId || !code || busy}
              onClick={() => verify(code)}
            >
              {busy ? <span className="loading loading-spinner" /> : "Check"}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-box border border-base-300 bg-base-200 p-4">
        <h2 className="font-semibold mb-3">Scan QR</h2>
        {!eventId ? (
          <div className="opacity-70">Select an event to enable scanning.</div>
        ) : (
          <QRScanner
  onCode={(text: string) => {
    if (lockRef.current || busy) return;
    lockRef.current = true;
    verify(String(text));
  }}
  onError={(err) => {
    const message =
      err instanceof Error ? err.message :
      typeof err === "string" ? err :
      "Scanner error";
    setResult({ kind: "error", message });
  }}
/>
        )}
      </div>

      {result && (
        <div className={`alert ${resultClass}`}>
          <span>{result.message}</span>
        </div>
      )}
    </div>
  );
}
