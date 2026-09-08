import type { NextConfig } from "next";

// Content-Security-Policy built for what this app actually loads, not copied
// from a template. Everything comes from our own origin except Supabase.
//
// `script-src` deliberately keeps 'unsafe-inline'. The strict alternative is a
// per-request nonce, which has to be generated in middleware and threaded
// through the document — and reading/writing a per-request nonce opts every
// route out of static rendering, which is exactly the cost the recent
// performance work removed. React escapes all interpolated content, there is
// no dangerouslySetInnerHTML anywhere in the app, and no user-supplied HTML is
// rendered, so the injection surface a nonce would defend is currently empty.
// The directives that *do* work without a nonce — object-src, base-uri,
// form-action, frame-ancestors — are all locked down below, and those are what
// contain an injection if one ever appears.
//
// 'unsafe-eval' is dev-only: Turbopack's HMR runtime needs it, production does
// not.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
  // Tailwind ships as a stylesheet, but Next inlines critical CSS.
  "style-src 'self' 'unsafe-inline'",
  // data:/blob: cover the client-side image resize preview in the product form;
  // Supabase serves the product-images bucket.
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  // Supabase REST + Auth over https, Realtime over wss. Google OAuth is a
  // top-level redirect, not a fetch, so it needs no exception here.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Redundant with frame-ancestors for modern browsers, kept for older ones.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Order ids and café ids appear in paths — don't leak them to third parties.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // The app asks for notifications only; nothing else should be reachable.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

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
  // Static header config — applied by the response layer, so this adds no
  // per-request work and does not opt any route out of static rendering.
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
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
