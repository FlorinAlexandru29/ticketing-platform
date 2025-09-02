import Navbar from '@/components/Navbar';
import dynamic from "next/dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

// client components
const EventRow = dynamic(() => import('@/components/Event/EventRow'), { ssr: false });
const RecommendedRow = dynamic(() => import('@/components/Event/RecommendedRow'), { ssr: false });

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const hasSpotify = Array.isArray((session?.user as any)?.oauthProviders)
    && (session!.user as any).oauthProviders.includes("spotify");

  return (
    <main className="min-h-dvh h-dvh flex flex-col bg-base-300 overflow-hidden">
      <Navbar />
      <section className="px-6 sm:px-8 md:px-12 pt-8 flex-grow overflow-y-auto flex flex-col items-start">
        <h1 className="text-3xl font-bold mb-1">Welcome to StageList</h1>
        <p className="opacity-70 mb-8">Discover live shows from your favorite artists.</p>

        <RecommendedRow hasSpotify={hasSpotify} />
        <EventRow heading="Concerts" type="CONCERT" pageSize={10} />
        <EventRow heading="Festivals" type="FESTIVAL" pageSize={10} />

        <footer className="mt-10 border-t border-base-300 pt-6 w-full flex-grow flex-row flex items-end">
          <a className="link mb-10" href="/host/apply">Become an event host</a>
        </footer>
      </section>
    </main>
  );
}
