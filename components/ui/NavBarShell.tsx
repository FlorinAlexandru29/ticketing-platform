'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import type { Session } from 'next-auth';
import { signIn, signOut } from 'next-auth/react';
import Drawer from '@/components/ui/Drawer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faBell, faX } from '@fortawesome/free-solid-svg-icons';

type Props = { session: Session | null; role: "USER" | "HOST" | "ADMIN" | null };

type Notif = {
  id: string;
  message: string;
  eventId: string | null;
  createdAt: string;
  readAt: string | null;
  event?: { id: string; title: string | null };
};

export default function NavbarShell({ session, role }: Props) {
  const [open, setOpen] = useState(false);
  const isAuthed = !!session?.user;

  // 🔐 Only show notifications if user has Spotify linked
  const providers = (session?.user as any)?.oauthProviders as string[] | undefined;
  const hasSpotify = Array.isArray(providers) && providers.includes('spotify');

  // Notifications UI state
  const [notifCount, setNotifCount] = useState<number>(0);
  const [notifs, setNotifs] = useState<Notif[] | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const loadingRef = useRef(false);

  // Initial unread count (only if Spotify-linked)
  useEffect(() => {
    if (!isAuthed || !hasSpotify) return;
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/notifications/unread_count", { cache: "no-store" });
        const j = await r.json();
        if (alive) setNotifCount(j.count || 0);
      } catch {}
    })();
    return () => { alive = false; };
  }, [isAuthed, hasSpotify]);

  // Toggle dropdown + fetch (and mark read once on open)
  async function toggleNotifDropdown() {
    const nextOpen = !notifOpen;
    setNotifOpen(nextOpen);

    if (nextOpen && isAuthed && hasSpotify && !loadingRef.current) {
      loadingRef.current = true;
      try {
        const r = await fetch("/api/notifications?markRead=1", { cache: "no-store" });
        const j = await r.json();
        setNotifs(Array.isArray(j.items) ? j.items : []);
        setNotifCount(0); // marked read on open
      } catch {
        setNotifs([]);
      } finally {
        loadingRef.current = false;
      }
    }
  }

  // Delete one notification
  async function deleteNotif(id: string) {
    const prev = notifs || [];
    setNotifs(prev.filter(n => n.id !== id));
    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    } catch {
      // best-effort
    }
  }

  return (
    <nav className="relative z-50 navbar border-neutral border dark:border-none dark:bg-base-100 text-neutral-content px-4">
      <div className="flex-1">
        <Link href="/" className="btn btn-soft text-xl">StageList</Link>
      </div>
      <div className="flex-none ml-4 flex items-center gap-2">
        {isAuthed && hasSpotify && (
          <div className="dropdown dropdown-end">
            <button
              className="btn dark:btn-ghost btn-neutral btn-outline btn-circle"
              onClick={toggleNotifDropdown}
              aria-label="Notifications"
            >
              <div className="indicator">
                <FontAwesomeIcon icon={faBell} />
                {notifCount > 0 && (
                  <span className="badge badge-error badge-sm indicator-item">{notifCount}</span>
                )}
              </div>
            </button>

            <ul tabIndex={0} className="dropdown-content menu w-80 rounded-box text-neutral dark:text-primary-content dark:bg-base-100 shadow-lg p-2 top-12 -right-10!">
              {!notifs && (
                <li className="disabled">
                  <a>{isAuthed ? "Loading…" : "Sign in to see notifications"}</a>
                </li>
              )}
              {notifs && notifs.length === 0 && (
                <li className="disabled"><a>No notifications</a></li>
              )}
              {notifs && notifs.map((n) => (
                <li key={n.id} className="py-1">
                  <div className="grid grid-cols-[1fr_auto] gap-2 items-start">
                    {n.eventId ? (
                      <Link href={`/events/${n.eventId}`} className="whitespace-pre-wrap leading-snug">
                        {n.message}
                      </Link>
                    ) : (
                      <span className="whitespace-pre-wrap leading-snug">{n.message}</span>
                    )}
                    <button
                      className="btn btn-xs btn-error btn-circle"
                      onClick={() => deleteNotif(n.id)}
                      title="Delete"
                    >
                      <FontAwesomeIcon icon={faX} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button className="btn btn-stoft dark:bg-base-200 btn-sm sm:hidden" onClick={() => setOpen(true)}>
          <FontAwesomeIcon icon={faBars} />
        </button>

        {isAuthed ? (
          <>
            <Link href="/my-profile" className="hover:underline link-neutral dark:text-neutral-content hidden sm:block">My Profile</Link>
            {(role === "HOST" || role === "ADMIN") && (
              <Link href="/dashboard" className="hover:underline link-neutral dark:text-neutral-content hidden sm:block">Dashboard</Link>
            )}
            <button className="btn btn-neutral btn-outline dark:btn-ghost btn-sm hidden sm:block" onClick={() => signOut()}>Logout</button>
          </>
        ) : (
          <Link href="/login" className="btn btn-neutral btn-outline dark:btn-ghost btn-wide hidden sm:flex">Login</Link>
        )}
      </div>

      <Drawer open={open} onClose={() => setOpen(false)} width={320}>
        <ul className="menu dark:bg-base-200 rounded-box w-full h-full justify-between">
          {isAuthed ? (
            <>
              {/* One <li> with both links */}
              <li className="mt-2">
                <Link href="/my-profile" className="hover:underline link-neutral dark:text-neutral-content" onClick={() => setOpen(false)}>
                  My Profile
                </Link>
                {(role === "HOST" || role === "ADMIN") && (
                  <Link href="/dashboard" className="hover:underline link-neutral dark:text-neutral-content" onClick={() => setOpen(false)}>
                    Dashboard
                  </Link>
                )}
              </li>

              {/* Separate <li> for logout */}
              <li>
                <button
                  className="btn btn-neutral btn-sm"
                  onClick={() => {
                    setOpen(false);
                    signOut();
                  }}
                >
                  Logout
                </button>
              </li>
            </>
          ) : (
            // Separate <li> for login
            <li>
              <Link href="/login" className="btn btn-neutral btn-sm" onClick={() => setOpen(false)}>
                Login
              </Link>
            </li>
          )}
        </ul>
      </Drawer>
    </nav>
  );
}
