'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';

export default function DeleteAccountModal() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <>
      <div className="w-full flex justify-center">
        <button type="button" className="btn btn-outline btn-error btn-wide" onClick={() => setOpen(true)}>
          Delete Account
        </button>
      </div>

      <div className={`modal ${open ? 'modal-open' : ''}`}>
        <div className="modal-box text-[var(--font-sz)]">
          <h3 className="font-bold text-lg text-error">Delete your account</h3>
          <div className="mt-3 space-y-2">
            <p>This will permanently delete your account, sessions, credentials, and any linked OAuth accounts (Spotify included).</p>
            <p>Tickets you’ve purchased will remain valid and visible to organizers, but they will no longer be associated with your account.</p>
            <p>If you are hosting events, you must transfer or delete them first.</p>
            <p className="mt-2">
              Type <code className="font-mono">DELETE</code> to confirm.
            </p>

            <label className="input input-bordered flex items-center mt-1">
              <input type="text" className="grow" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" />
            </label>

            {err && <p className="text-error text-sm">{err}</p>}
          </div>

          <div className="modal-action">
            <button type="button" className="btn btn-outline" onClick={() => !loading && setOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className={`btn btn-error ${loading || confirm !== 'DELETE' ? 'btn-disabled' : ''}`}
              disabled={loading || confirm !== 'DELETE'}
              onClick={async () => {
                setErr(null);
                setLoading(true);
                try {
                  const res = await fetch('/api/account/delete', { method: 'DELETE' });
                  const j = await res.json().catch(() => ({}));
                  if (!res.ok || !j?.ok) throw new Error(j?.error || `HTTP ${res.status}`);
                  await signOut({ redirect: true, callbackUrl: '/' });
                } catch (e: any) {
                  setErr(e?.message ?? 'Failed to delete account');
                } finally {
                  setLoading(false);
                }
              }}
            >
              {loading ? <span className="loading loading-spinner" /> : 'Delete account'}
            </button>
          </div>
        </div>

        <div className="modal-backdrop fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !loading && setOpen(false)} />
      </div>
    </>
  );
}
