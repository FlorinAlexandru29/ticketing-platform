export const runtime = "nodejs";          // <- important
export const dynamic = "force-dynamic";   // avoid static optimization

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

