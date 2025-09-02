// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Option 1: granular + wildcard (recommended)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.scdn.co',         // Spotify profile/artist images
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.fbcdn.net',       // Facebook CDN variants (scontent-xx.fbcdn.net)
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'scontent-*.xx.fbcdn.net', // newer Next supports multi-wildcards
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'platform-lookaside.fbsbx.com', // some FB avatars resolve here
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // some FB avatars resolve here
        pathname: '/**',
      },
      {
        protocol: "https",
        hostname: "gncumnhjfspuyyngrxxl.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],

    // Or Option 2: simple list (less flexible)
    // domains: ['i.scdn.co', 'scontent-tpe1-1.xx.fbcdn.net', 'platform-lookaside.fbsbx.com'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Make any accidental client import of Prisma fail fast at build time
      config.resolve.alias['@prisma/client'] = false;
      config.resolve.alias['@/lib/prisma'] = false;
      config.resolve.alias['prisma'] = false;
    }
    return config;
  },
};

module.exports = nextConfig;
