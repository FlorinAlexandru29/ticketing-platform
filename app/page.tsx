import Navbar from '@/components/Navbar';

export default function HomePage() {
  return (
    <>
    
      <Navbar />
      <main className="p-8 text-center">
        <h1 className="text-3xl font-bold mb-4">Welcome to StageList</h1>
        <p className="text-gray-600">
          Discover live shows from your favorite artists. Log in to get started.
        </p>
      </main>
    </>
  );
}
