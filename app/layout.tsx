import type { Metadata, Viewport } from "next";
import { Barlow, Geist_Mono, Bebas_Neue } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/ui/service-worker-register";
import { BfcacheReload } from "@/components/ui/bfcache-reload";
import "./globals.css";

// Display face. The brand guide specifies Bebas Neue Pro; Bebas Neue is the
// libre release of the same design and is what the wordmark, headings and
// large numerals are set in.
const bebasNeue = Bebas_Neue({
  variable: "--font-bebas-neue",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

// Body face. A slightly-condensed grotesque that sits under Bebas without
// fighting it — keeps long-form UI copy readable at small sizes.
const barlow = Barlow({
  variable: "--font-barlow",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sherpa Sips",
  description: "Guiding you to the perfect brew — café supply ordering",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sherpa Sips",
  },
  // Declared explicitly rather than relying on the app/ file convention —
  // the scaffold's default favicon.ico used to win here and shipped the
  // create-next-app mark in the browser tab.
  icons: {
    icon: [
      { url: "/icons/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#5C2D11",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${barlow.variable} ${geistMono.variable} ${bebasNeue.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream-100 text-brand-950">
        <ServiceWorkerRegister />
        <BfcacheReload />
        {children}
      </body>
    </html>
  );
}
