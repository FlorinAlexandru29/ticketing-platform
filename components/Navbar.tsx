import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import NavbarShell from './ui/NavBarShell';

export default async function Navbar() {
  const session = await getServerSession(authOptions);
  

  return (
    <NavbarShell session={session} />
  );
}


/*  */
        