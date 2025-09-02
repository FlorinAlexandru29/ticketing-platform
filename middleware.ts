// middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" }, // redirect unauthenticated users
});

export const config = {
  matcher: [
    "/dashboard/:path*",  // protect dashboard only; role checks stay server-side
  ],
};
