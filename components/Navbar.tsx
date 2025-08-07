'use client';

import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="relative z-50 navbar bg-base-100 text-neutral-content px-4">
      <div className="flex-1">
        <Link href="/" className="btn btn-ghost text-xl">
          StageList
        </Link>
      </div>

      <div className="flex space-x-4">
        <Link className="hover:underline" href="/events">Events</Link>
        <Link className="hover:underline" href="/artists">Artists</Link>
        <Link className="hover:underline" href="/tickets">Tickets</Link>
      </div>

      <div className="flex-none ml-4">
        <Link href="/login" className="btn btn-neutral btn-sm">
          Login
        </Link>
      </div>
    </nav>
  );
}
