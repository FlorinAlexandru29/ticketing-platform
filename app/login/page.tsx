// app/login/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { redirect } from 'next/navigation';
import LoginShell from './LoginShell';

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  // If the user is already logged in, send them away from /login
  if (session?.user) {
    redirect('/'); // or '/' if you prefer
  }

  // No session → render the client UI
  return <LoginShell />;
}
