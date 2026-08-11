import { WifiOff, RefreshCw } from 'lucide-react'

export const metadata = { title: 'Offline — Sherpa Sips' }

// Served by the service worker's navigation fallback (public/sw.js) when a
// page request fails with no network — never reached through normal
// routing, so it stays outside (cafe)/admin and skips auth entirely
// (see proxy.ts matcher) so it works regardless of login state.
//
// Styled with inline styles instead of Tailwind classes on purpose: when
// this is served from the service worker's cache while offline, the
// document's external stylesheet may not be cached and can fail to load —
// this page needs to look right with zero other network requests. That also
// rules out the brand webfonts, so the display type falls back to a
// condensed system stack. Brand hex values are inlined for the same reason.
const INK = '#5C2D11'
const PAPER = '#FDFBF5'
const GOLD = '#DDA25E'
const OLIVE = '#3C3B1F'

const DISPLAY_STACK =
  '"Bebas Neue", "Oswald", "Haettenschweiler", "Arial Narrow", system-ui, sans-serif'
const BODY_STACK = 'system-ui, -apple-system, "Segoe UI", sans-serif'

export default function OfflinePage() {
  return (
    <>
      {/* The document reset normally comes from globals.css, which is exactly
          what may be missing here — without it the browser's default 8px body
          margin and white canvas frame the page. Restated inline so the page
          fills the viewport with no stylesheet at all. */}
      <style>{`html,body{margin:0;padding:0;background:${INK};}`}</style>

      <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
        background: INK,
        fontFamily: BODY_STACK,
      }}
    >
      {/* Brand mark — inline SVG (not SherpaSipsLogo) because this page must
          render with zero other network requests, so it can't rely on the
          external stylesheet for classes or CSS custom properties. */}
      <svg viewBox="0 0 200 260" style={{ width: 56, height: 73 }} aria-hidden="true">
        <clipPath id="offline-bean">
          <path d="M100 4C152 4 186 56 186 130C186 204 152 256 100 256C48 256 14 204 14 130C14 56 48 4 100 4Z" />
        </clipPath>
        <g clipPath="url(#offline-bean)">
          <rect x="0" y="0" width="200" height="260" fill={GOLD} />
          <path d="M8 152C58 182 88 174 122 196C150 214 172 208 192 192L192 264L8 264Z" fill={OLIVE} />
          <path
            d="M129 10C97 56 147 92 104 132C64 170 109 208 78 250"
            fill="none"
            stroke={INK}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path d="M26 186L56 130L72 152L98 84L122 140L136 124L174 186Z" fill={INK} />
        </g>
      </svg>

      <p
        style={{
          fontFamily: DISPLAY_STACK,
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          fontSize: 13,
          color: GOLD,
          margin: '28px 0 0',
        }}
      >
        No signal
      </p>

      <h1
        style={{
          fontFamily: DISPLAY_STACK,
          textTransform: 'uppercase',
          fontSize: 46,
          lineHeight: 0.95,
          letterSpacing: '0.01em',
          fontWeight: 400,
          color: PAPER,
          margin: '14px 0 0',
        }}
      >
        You&apos;re offline
      </h1>

      <p
        style={{
          fontSize: 15,
          color: 'rgba(226,221,200,0.7)',
          marginTop: 16,
          lineHeight: 1.65,
          maxWidth: 320,
        }}
      >
        Sherpa Sips needs a connection to load your orders and catalog. Check your
        connection and try again.
      </p>

      {/* Plain anchor, not next/link — this needs a real network round-trip
          through the service worker's fetch handler, not a client-side
          router transition. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/"
        style={{
          marginTop: 32,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 9,
          background: GOLD,
          color: INK,
          fontFamily: DISPLAY_STACK,
          textTransform: 'uppercase',
          letterSpacing: '0.09em',
          fontSize: 17,
          padding: '15px 30px',
          borderRadius: 8,
          textDecoration: 'none',
        }}
      >
        <RefreshCw style={{ width: 15, height: 15 }} />
        Try again
      </a>

      <p
        style={{
          position: 'fixed',
          bottom: 26,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          fontFamily: DISPLAY_STACK,
          textTransform: 'uppercase',
          fontSize: 12,
          letterSpacing: '0.22em',
          color: 'rgba(226,221,200,0.4)',
          zIndex: 1,
        }}
      >
        <WifiOff style={{ width: 13, height: 13 }} aria-hidden="true" />
        Sherpa Sips
      </p>

      {/* Ridgeline anchoring the page, matching the online brand surfaces. */}
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: 90,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        <path
          d="M0 120 L0 82 L96 54 L168 68 L286 18 L372 58 L468 44 L604 76 L742 26 L836 62 L946 50 L1084 80 L1198 38 L1288 64 L1372 52 L1440 72 L1440 120 Z"
          fill={OLIVE}
          opacity="0.4"
        />
        <path
          d="M0 120 L0 104 L128 86 L242 100 L360 72 L470 96 L578 84 L706 106 L842 78 L960 100 L1092 90 L1214 108 L1330 92 L1440 102 L1440 120 Z"
          fill={OLIVE}
        />
      </svg>
      </main>
    </>
  )
}
