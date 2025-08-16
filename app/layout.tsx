'use client';
import "./globals.css";
import "./app.css";
import { SessionProvider } from "next-auth/react";
import '../lib/fontawesome'; // << add this line

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <script async src="https://kit.fontawesome.com/fb2a34bcfa.js" crossOrigin="anonymous"></script>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
      <body><SessionProvider>{children}</SessionProvider></body></html>
  );
}
