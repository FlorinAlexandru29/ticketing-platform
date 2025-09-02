import Navbar from '@/components/Navbar';
import dynamic from "next/dynamic";

// EventRow is client-side (fetches on demand)
const EventRow = dynamic(() => import('@/components/Event/EventRow'), { ssr: !true });
const RecommendedRow = dynamic(() => import('@/components/Event/RecommendedRow'), { ssr: !true });

export default function HomePage() {
  return (
    <>
      <main className="min-h-dvh h-dvh flex flex-col bg-base-300 overflow-hidden">
      <Navbar />
      
        <section className="px-6 sm:px-8 md:px-12 pt-8 flex-grow overflow-y-auto">
        <h1 className="text-3xl font-bold mb-1">Welcome to StageList</h1>
        <p className="opacity-70 mb-8">Discover live shows from your favorite artists.</p>
        <RecommendedRow />
        <EventRow heading="Concerts" type="CONCERT" pageSize={10} />
        <EventRow heading="Festivals" type="FESTIVAL" pageSize={10} />
        <footer className="mt-10 border-t border-base-300 pt-6">
        <a className="link" href="/host/apply">Become an event host</a>
        </footer>
        </section>
        
      </main>
      
    </>
  );
}
