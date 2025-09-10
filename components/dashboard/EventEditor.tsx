'use client';

import { useState } from "react";

type Tier = { id: string; category: string; priceCents: number; quantity: number;};
type Props = {
  eventId: string;
  initial: {
    title: string;
    startAt: string;
    endAt: string | null;
    city: string;
    venueName: string;
    ticketTiers: Tier[];
  };
  canDelete?: boolean;
  
};

export default function EventEditor({ eventId, initial, canDelete = false}: Props) {
  const [title, setTitle] = useState(initial.title);
  const [startAt, setStartAt] = useState(initial.startAt.slice(0,16)); // datetime-local
  const [endAt, setEndAt] = useState(initial.endAt ? initial.endAt.slice(0,16) : "");
  const [city, setCity] = useState(initial.city);
  const [venueName, setVenueName] = useState(initial.venueName);
  const [tiers, setTiers] = useState<Tier[]>(initial.ticketTiers);
  const [tiersCopy, setTiersCopy] = useState<Tier[]>(initial.ticketTiers);
  const [busy, setBusy] = useState(false);


  async function save() {
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({
          title,
          startAt: new Date(startAt).toISOString(),
          endAt: endAt ? new Date(endAt).toISOString() : null,
          city,
          venueName,
          ticketTiers: tiersCopy.map(t => ({ id: t.id, priceCents: t.priceCents, quantity: t.quantity })),
        })
      });
      if (!res.ok) {
        const j = await res.json().catch(()=>null);
        throw new Error(j?.error || "Failed to save");
      }
      
      alert("Saved!");
      window.location.href ="/dashboard/host/events/"+eventId+"/edit";
    } catch (e:any) {
      alert(e.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(()=>null);
        throw new Error(j?.error || "Failed to delete");
      }
      window.location.href ="/dashboard";
    } catch (e:any) {
      alert(e.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="form-control">
          <span className="label-text">Title</span>
          <input className="input input-bordered" value={title} onChange={e=>setTitle(e.target.value)}/>
        </label>
        <label className="form-control">
          <span className="label-text">City</span>
          <input className="input input-bordered" value={city} onChange={e=>setCity(e.target.value)}/>
        </label>
        <label className="form-control">
          <span className="label-text">Venue</span>
          <input className="input input-bordered" value={venueName} onChange={e=>setVenueName(e.target.value)}/>
        </label>
        <label className="form-control">
          <span className="label-text">Start</span>
          <input type="datetime-local" className="input input-bordered" value={startAt} onChange={e=>setStartAt(e.target.value)}/>
        </label>
        <label className="form-control">
          <span className="label-text">End</span>
          <input type="datetime-local" className="input input-bordered" value={endAt} onChange={e=>setEndAt(e.target.value)}/>
        </label>
      </div>

      <section className="rounded-box border border-base-300 p-3 bg-base-100">
        <h2 className="font-semibold mb-2">Ticket Tiers</h2>
        <div className="space-y-2">
          {tiers.map((t, idx)=>(
            <div key={t.id} className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
              <div>
                <div className="text-sm opacity-70">{t.category}</div>
                <div className="text-sm opacity-70">Quantity : {t.quantity}</div>
                <div className="text-sm opacity-70">Price : {(t.priceCents/100).toString()}</div>
              </div>
              <label className="form-control">
                <span className="label-text">New Price (RON)</span>
                <input type="number" className="input input-bordered w-36"
                  onBlur={e=>{
                    const v = Math.max(0, Math.round(Number(e.target.value||0)*100));
                    setTiersCopy(prev => prev.map((x,i)=> i===idx ? {...x, priceCents:v} : x));
                    e.target.value = (v/100).toString();
                  }}
                  onChange={() => ({})}
                />
              </label>
              <label className="form-control">
                <span className="label-text">New Quantity</span>
                <input type="number" className="input w-28"
                  onBlur={e=>{
                    const v = Math.max(t.quantity, Number(e.target.value||0)); // only allow raise
                    setTiersCopy(prev => prev.map((x,i)=> i===idx ? {...x, quantity:v} : x));
                    e.target.value = v.toString();
                  }}
                  onChange={() => ({})}
                />
              </label>
            </div>
          ))}
        </div>
        <p className="text-xs opacity-70 mt-2">Quantity can only be increased.</p>
      </section>

      <div className="flex gap-2 justify-end">
        {canDelete && (
          <button className="btn btn-error" onClick={del} disabled={busy}>Delete</button>
        )}
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
