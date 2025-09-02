'use client';

import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink, faLinkSlash, faArrowsRotate } from '@fortawesome/free-solid-svg-icons';
import { faSpotify } from '@fortawesome/free-brands-svg-icons';

type Props = {
  hasSpotify: boolean;
  unlinkAllowed: boolean;
  onUpdated?: () => void;
};

export default function SpotifySection({ hasSpotify, unlinkAllowed, onUpdated }: Props) {
  // Local "linked" state prevents a fetch race after unlinking
  const [linked, setLinked] = useState<boolean>(hasSpotify);
  useEffect(() => setLinked(hasSpotify), [hasSpotify]);

  const [spLoading, setSpLoading] = useState(false);
  const [spProfileUrl, setSpProfileUrl] = useState<string | null>(null);

  // Unlink modal state
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [unlinkError, setUnlinkError] = useState<string | null>(null);

  // Manual sync state
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncErr, setSyncErr] = useState<string | null>(null);

  // Lazy fetch of Spotify profile URL (only while linked)
  useEffect(() => {
    if (!linked || spProfileUrl) return;
    let cancelled = false;

    (async () => {
      try {
        setSpLoading(true);
        const r = await fetch('/api/spotify/me', { cache: 'no-store' });

        // Not linked / unauthorized → stop quietly (no console error)
        if (!r.ok) {
          if ([400, 401, 403, 404].includes(r.status)) {
            if (!cancelled) {
              setLinked(false);
              setSpProfileUrl(null);
            }
            return;
          }
          return;
        }

        const j = await r.json();
        if (!cancelled) setSpProfileUrl(j?.external_url ?? null);
      } finally {
        if (!cancelled) setSpLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [linked, spProfileUrl]);

  async function handleSync() {
    setSyncLoading(true);
    setSyncMsg(null);
    setSyncErr(null);
    try {
      const r = await fetch('/api/spotify/sync-followed', { method: 'POST' });
      const ct = r.headers.get('content-type') || '';
      const payload = ct.includes('application/json') ? await r.json().catch(() => ({})) : {};

      if (!r.ok) {
        const msg =
          typeof payload?.error === 'string'
            ? payload.error
            : r.status === 400
            ? 'Spotify not linked or token unavailable'
            : `Sync failed (HTTP ${r.status})`;
        setSyncErr(msg);
        return;
      }

      const count = Number(payload?.count ?? 0);
      setSyncMsg(`Synced ${count} followed artist${count === 1 ? '' : 's'}.`);
      onUpdated?.(); // refresh profile/any dependent UI
    } catch (e: any) {
      setSyncErr(e?.message || 'Network error during sync');
    } finally {
      setSyncLoading(false);
    }
  }

  return (
    <div className="w-3/4 flex flex-col">
      <div className={`flex items-center ${!linked ? 'justify-center' : 'gap-4 flex-wrap justify-between sm:justify-center'}`}>
        {!linked ? (
          <button
            type="button"
            className="btn btn-success btn-wide"
            onClick={() => {
              window.location.href = '/api/link/spotify/start';
            }}
          >
            <FontAwesomeIcon className="mr-2" icon={faLink} />
            Link Spotify
            <FontAwesomeIcon className="ml-2" icon={faSpotify} />
          </button>
        ) : (
          <>
            <a
              href={spProfileUrl ?? '#'}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline btn-success"
              aria-disabled={!spProfileUrl}
              onClick={(e) => {
                if (!spProfileUrl) e.preventDefault();
              }}
            >
              {spLoading ? (
                <span className="loading loading-spinner" />
              ) : (
                <>
                  Open Spotify Profile
                  <FontAwesomeIcon className="ml-2" icon={faSpotify} />
                </>
              )}
            </a>

            <button
              type="button"
              className="btn btn-outline btn-success"
              onClick={handleSync}
              disabled={syncLoading}
              title="Sync followed artists from Spotify"
            >
              {syncLoading ? (
                <span className="loading loading-spinner" />
              ) : (
                <>
                  <FontAwesomeIcon className="mr-2" icon={faArrowsRotate} />
                  Sync followed artists
                </>
              )}
            </button>

            {unlinkAllowed && (
              <div className="tooltip join-item" data-tip="Unlink Spotify">
                <button
                  type="button"
                  className="btn btn-error btn-outline btn-circle"
                  onClick={() => setUnlinkOpen(true)}
                >
                  <FontAwesomeIcon icon={faLinkSlash} />
                </button>
              </div>
            )}

            {/* Unlink modal */}
            <div className={`modal ${unlinkOpen ? 'modal-open' : ''}`}>
              <div className="modal-box text-[var(--font-sz)]">
                <h3 className="font-bold text-lg">Unlink Spotify</h3>
                <p className="mt-2">
                  This will disconnect Spotify from your account. You’ll still be able to sign in with your other methods.
                </p>

                {unlinkError && <p className="text-error text-sm mt-3">{unlinkError}</p>}

                <div className="modal-action">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => !unlinkLoading && setUnlinkOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={`btn btn-error ${(!unlinkAllowed || unlinkLoading) ? 'btn-disabled' : ''}`}
                    disabled={!unlinkAllowed || unlinkLoading}
                    onClick={async () => {
                      setUnlinkError(null);
                      setUnlinkLoading(true);
                      try {
                        const r = await fetch('/api/link/spotify/unlink', { method: 'POST' });
                        const j = await r.json().catch(() => ({}));
                        if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);

                        setLinked(false);
                        setSpProfileUrl(null);
                        setUnlinkOpen(false);

                        onUpdated?.(); // e.g., router.refresh()
                      } catch (e: any) {
                        setUnlinkError(e?.message ?? 'Failed to unlink Spotify');
                      } finally {
                        setUnlinkLoading(false);
                      }
                    }}
                  >
                    {unlinkLoading ? <span className="loading loading-spinner" /> : 'Unlink'}
                  </button>
                </div>
              </div>

              <div
                className="modal-backdrop fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => !unlinkLoading && setUnlinkOpen(false)}
              />
            </div>
          </>
        )}
      </div>

      {/* Sync feedback */}
      {(syncMsg || syncErr) && (
        <div className={`alert mt-3 ${syncErr ? 'alert-error' : 'alert-success'}`}>
          <span>{syncErr || syncMsg}</span>
        </div>
      )}
    </div>
  );
}
