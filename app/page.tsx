import Navbar from '@/components/Navbar';
import dynamic from "next/dynamic";

// EventRow is client-side (fetches on demand)
const EventRow = dynamic(() => import('@/components/Event/EventRow'), { ssr: !true });

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="px-6 sm:px-8 md:px-12 py-8">
        <h1 className="text-3xl font-bold mb-1">Welcome to StageList</h1>
        <p className="opacity-70 mb-8">Discover live shows from your favorite artists.</p>

        <EventRow heading="Concerts" type="CONCERT" pageSize={10} />
        <EventRow heading="Festivals" type="FESTIVAL" pageSize={10} />
      </main>
    </>
  );
}
