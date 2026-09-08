import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    // Back-navigation (shop → cart → back) re-fetched the whole RSC payload,
    // which on this app means re-running every query on the page. Reusing it
    // for 30s makes going back instant. Safe alongside the `no-store` header
    // on authenticated pages: that guards the *browser's* bfcache, this is the
    // in-memory client router cache, and signing out does a hard navigation
    // (components/sign-out-button.tsx) which discards it. Anything that must
    // stay live is already pushed by Realtime, whose refresh clears the cache.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
