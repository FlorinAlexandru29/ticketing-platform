import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getSpotifyProfile } from '@/lib/spotify';
import Navbar from '@/components/Navbar';
import ProfileCard from '@/components/my-profile/ProfileCard';
import TicketsSection from '@/components/my-profile/TicketsSection';
import MyProfilePageCard from '@/components/my-profile/MyProfilePageCard';

export const dynamic = 'force-dynamic'; // keeps this request-scoped (avoids early static eval)

export default async function MyProfilePage() {
  // ✅ Server-side session fetch (safe)
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <main className="p-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold">My Profile</h1>
        <p className="mt-4 opacity-80">You need to sign in to view your profile.</p>
        <a
          href="/api/auth/signin"
          className="inline-block mt-4 px-4 py-2 rounded-xl border shadow-sm"
        >
          Sign in
        </a>
      </main>
    );
  }

  // ✅ Server-side Spotify fetch (no client-side promises in render)
  let spotify: Awaited<ReturnType<typeof getSpotifyProfile>> | null = null;
  const accessToken =
    (session as any)?.accessToken ||
    (session as any)?.spotify?.accessToken;

  if (accessToken) {
    try {
      spotify = await getSpotifyProfile(accessToken);
    } catch {
      // ignore — ProfileCard will still render with session data
    }
  }

  return (
    <main className="bg-sky-50 h-svh flex flex-col overflow-x-hidden">
      <Navbar />

      <MyProfilePageCard
        left={<ProfileCard session={session} spotify={spotify} />}
        right={<TicketsSection />}
      />
    </main>
  );
}
