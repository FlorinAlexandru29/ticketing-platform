'use client';

import { useState } from 'react';

type Props = { canChangePassword: boolean; onUpdated?: () => void };

export default function PasswordModal({ canChangePassword, onUpdated }: Props) {
  const [open, setOpen] = useState(false);
  const [oldP, setOldP] = useState('');
  const [newP, setNewP] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onConfirm() {
    setErr(null);
    const a = (oldP || '').trim();
    const b = (newP || '').trim();
    if (!a || !b) return setErr('Please fill both fields.');
    if (b.length < 8) return setErr('New password must be at least 8 characters.');
    if (a === b) return setErr('New password must be different from the old one.');

    setLoading(true);
    try {
      const res = await fetch('/api/account/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword: a, newPassword: b }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) throw new Error(j?.error || `HTTP ${res.status}`);
      setOpen(false);
      setOldP('');
      setNewP('');
      onUpdated?.();
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  }

  if (!canChangePassword) return null;

  return (
    <>
      <div className="w-full flex justify-center">
        <button type="button" className="btn btn-error btn-wide" onClick={() => setOpen(true)}>
          Change Your Password
        </button>
      </div>

      <div className={`modal ${open ? 'modal-open' : ''}`}>
        <div className="modal-box text-[var(--font-sz)]">
          <h3 className="font-bold text-lg">Change your password</h3>

          <div className="form-control flex flex-col gap-2 mt-4">
            <span className="opacity-70 whitespace-nowrap">Old Password</span>
            <label className="input input-bordered flex items-center">
              <input type="password" className="grow" value={oldP} onChange={(e) => setOldP(e.target.value)} autoComplete="current-password" />
            </label>

            <span className="opacity-70 whitespace-nowrap">New Password</span>
            <label className="input input-bordered flex items-center">
              <input type="password" className="grow" value={newP} onChange={(e) => setNewP(e.target.value)} autoComplete="new-password" />
            </label>

            {err && <p className="text-error text-sm">{err}</p>}
          </div>

          <div className="modal-action">
            <button
              type="button"
              className="btn btn-outline btn-error"
              onClick={() => {
                if (!loading) {
                  setOpen(false);
                  setErr(null);
                  setOldP('');
                  setNewP('');
                }
              }}
            >
              Cancel
            </button>
            <button type="button" className={`btn btn-success ${loading ? 'btn-disabled' : ''}`} onClick={onConfirm} disabled={loading}>
              {loading ? <span className="loading loading-spinner" /> : 'Confirm'}
            </button>
          </div>
        </div>

        <div
          className="modal-backdrop fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 opacity-100 pointer-events-auto"
          onClick={() => !loading && setOpen(false)}
        />
      </div>
    </>
  );
}
