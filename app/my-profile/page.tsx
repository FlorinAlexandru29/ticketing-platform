// app/my-profile/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getSpotifyProfile } from "@/lib/spotify"; // from earlier snippet
import ProfileCard from "@/components/my-profile/ProfileCard";
import TicketsSection from "@/components/my-profile/TicketsSection";
import Navbar from '@/components/Navbar';


export default async function MyProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <main className="p-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold">My Profile</h1>
        <p className="mt-4 opacity-80">
          You need to sign in to view your profile.
        </p>
        <a
          href="/api/auth/signin"
          className="inline-block mt-4 px-4 py-2 rounded-xl border shadow-sm"
        >
          Sign in
        </a>
      </main>
    );
  }

  let spotify: Awaited<ReturnType<typeof getSpotifyProfile>> | null = null;
  if ((session as any).accessToken) {
    try {
      spotify = await getSpotifyProfile((session as any).accessToken as string);
    } catch {
      // ignore: we’ll just show session data
    }
  }

  return (
    <>
     <Navbar />
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">My Profile</h1>
      <ProfileCard session={session} spotify={spotify} />
      <TicketsSection />
    </main>
    </>
  );
}
