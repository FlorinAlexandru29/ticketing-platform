import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getSpotifyProfile } from '@/lib/spotify';
import { redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ProfilePage from '@/components/profile/ProfilePage';
import TicketsSection from '@/components/my-profile/TicketsSection';
import MyProfilePageCard from '@/components/my-profile/MyProfilePageCard';

export const dynamic = 'force-dynamic'; // keeps this request-scoped (avoids early static eval)

export default async function MyProfilePage() {
  // ✅ Server-side session fetch (safe)
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    // Server-side redirect
    // Import redirect from next/navigation at the top of the file:
    // import { redirect } from 'next/navigation';
    redirect('/');
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
        left={<ProfilePage session={session} spotify={spotify} />}
        right={<TicketsSection />}
      />
    </main>
  );
}
