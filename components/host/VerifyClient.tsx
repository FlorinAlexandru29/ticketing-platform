"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRScanner from "@/components/host/QRScanner";

type EventLite = { id: string; title: string; startAt: string };

type VerifyResult =
  | { kind: "ok"; message: string; category?: string | null }
  | { kind: "warn"; message: string; category?: string | null }
  | { kind: "error"; message: string; category?: string | null }
  | null;

export default function VerifyClient() {
  const [events, setEvents] = useState<EventLite[]>([]);
  const [eventId, setEventId] = useState<string>("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VerifyResult>(null);

  // Lock that actually re-renders UI
  const [locked, setLocked] = useState(false);

  // Internal refs for logic/timers
  const lockRef = useRef(false);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownMs = 2500; // ~2–3 seconds

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

    return () => {
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, []);

  function armCooldown() {
    // clear any previous timer
    if (cooldownRef.current) clearTimeout(cooldownRef.current);
    cooldownRef.current = setTimeout(() => {
      lockRef.current = false;
      setLocked(false);
      setResult(null); // hide result after the same cooldown
    }, cooldownMs);
  }

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

      const cat: string | null | undefined = j.category;

      switch (j.status) {
        case "validated":
          setResult({
            kind: "ok",
            message: j.message || "Ticket was validated.",
            category: cat ?? undefined,
          });
          break;
        case "already":
          setResult({
            kind: "warn",
            message: j.message || "Ticket was already validated.",
            category: cat ?? undefined,
          });
          break;
        case "wrong_event":
          setResult({
            kind: "error",
            message: j.message || "Ticket not valid for this event.",
          });
          break;
        case "not_found":
          setResult({
            kind: "error",
            message: j.message || "Ticket does not exist.",
          });
          break;
        default:
          setResult({
            kind: "error",
            message: j.message || "Error reading ticket",
          });
      }
    } catch (e: any) {
      setResult({ kind: "error", message: e?.message || "Error reading ticket" });
    } finally {
      setBusy(false);
      armCooldown(); // release + hide after cooldown
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
              onClick={() => {
                lockRef.current = true;
                setLocked(true);     // show banner
                verify(code);
              }}
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
              setLocked(true);       // show banner
              verify(String(text));
            }}
            onError={(err) => {
              const message =
                err instanceof Error ? err.message :
                typeof err === "string" ? err :
                "Scanner error";
              setResult({ kind: "error", message });
              // still arm cooldown so UI clears
              lockRef.current = true;
              setLocked(true);
              armCooldown();
            }}
          />
        )}
        {locked && (
          <div className="mt-2 text-xs opacity-70">
            Hold on… ready to scan next ticket in ~{Math.round(cooldownMs / 1000)}s
          </div>
        )}
      </div>

      {result && (
        <div className={`alert ${resultClass} items-center gap-3`}>
          <span>{result.message}</span>
          {result.category ? (
            <span className="badge badge-outline badge-lg">{result.category}</span>
          ) : null}
        </div>
      )}
    </div>
  );
}
