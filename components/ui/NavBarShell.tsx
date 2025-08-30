'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Session } from 'next-auth';
import { signIn, signOut } from 'next-auth/react';
import Drawer from '@/components/ui/Drawer';

type Props = { session: Session | null };

export default function NavbarShell({ session }: Props) {
  const [open, setOpen] = useState(false);
  const isAuthed = !!session?.user;

  return (
    <nav className="relative z-50 navbar bg-base-100 text-neutral-content px-4">
      <div className="flex-1">
        <Link href="/" className="btn btn-ghost text-xl">StageList</Link>
      </div>

      <div className="flex space-x-4">
        <Link className="hover:underline" href="/events">Events</Link>
        <Link className="hover:underline" href="/artists">Artists</Link>
        <Link className="hover:underline" href="/tickets">Tickets</Link>
      </div>

      <div className="flex-none ml-4 flex items-center gap-2">
        <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
          Menu
        </button>

        {isAuthed ? (
          <>
            <Link href="/my-profile">My Profile</Link>
            <button className="btn btn-neutral btn-sm" onClick={() => signOut()}>Logout</button>
          </>
        ) : (
          <Link href="/login" className="btn btn-neutral btn-sm">Login</Link>
        )}
      </div>

      <Drawer open={open} onClose={() => setOpen(false)} width={320}>
        <ul className="menu bg-base-200 rounded-box w-full">
          <li><Link href="/events" onClick={() => setOpen(false)}>Events</Link></li>
          <li><Link href="/artists" onClick={() => setOpen(false)}>Artists</Link></li>
          <li><Link href="/tickets" onClick={() => setOpen(false)}>Tickets</Link></li>
          <li className="mt-2">
            {isAuthed ? (
              <button
                className="btn btn-sm btn-neutral"
                onClick={() => { setOpen(false); signOut(); }}
              >
                Logout
              </button>
            ) : (
              <button
                className="btn btn-sm btn-accent"
                onClick={() => { setOpen(false); signIn('spotify'); }}
              >
                Login with Spotify
              </button>
            )}
          </li>
        </ul>
      </Drawer>
    </nav>
  );
}
