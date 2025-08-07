import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./app.css";



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <script async src="https://kit.fontawesome.com/fb2a34bcfa.js" crossOrigin="anonymous"></script>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
      <body
        className=""
      >
        {children}
      </body>
    </html>
  );
}
