import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getSpotifyProfile } from '@/lib/spotify';
import { redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ProfilePage from '@/components/profile/ProfilePage';
import TicketsSection from '@/components/my-profile/TicketsSection';
import MyProfilePageCard from '@/components/my-profile/MyProfilePageCard';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MyProfilePage() {
  // Server-side session
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) {
    redirect('/');
  }

  // Hard check the user still exists (handles "deleted user but old JWT" case)
  const exists = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!exists) {
    redirect('/');
  }

  // Server-side Spotify fetch (best-effort)
  let spotify: Awaited<ReturnType<typeof getSpotifyProfile>> | null = null;
  const accessToken =
    (session as any)?.accessToken || (session as any)?.spotify?.accessToken;
  if (accessToken) {
    try {
      spotify = await getSpotifyProfile(accessToken);
    } catch {
      // ignore
    }
  }

  return (
    <main className="bg-sky-50 h-svh flex flex-col overflow-x-hidden">
      <Navbar />
      <MyProfilePageCard
        left={<ProfilePage session={session as any} spotify={spotify} />}
        right={<TicketsSection />}
      />
    </main>
  );
}
