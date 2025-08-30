// app/login/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { redirect } from 'next/navigation';
import LoginShell from './LoginShell';
import Navbar from '@/components/Navbar'; // <— server component OK here

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect('/');

  return (
    <>
    <main className="bg-sky-50 h-svh flex flex-col overflow-x-hidden">
      <Navbar />
      <LoginShell />
      </main>
    </>
  );
}