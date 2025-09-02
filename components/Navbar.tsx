// components/Navbar.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import NavbarShell from './ui/NavBarShell';
import { prisma } from '@/lib/prisma';

export default async function Navbar() {
  const session = await getServerSession(authOptions);
  const role =
    session?.user?.id
      ? (await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { role: true },
        }))?.role ?? null
      : null;

  return <NavbarShell session={session} role={role as "USER" | "HOST" | "ADMIN" | null} />;
}
