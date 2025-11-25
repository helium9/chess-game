import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  themeColor: "#0d0d0d",
  width: "device-width",
  initialScale: 1,
};

export const metadata = {
  metadataBase: new URL("https://www.p2p-chess.tech"),
  title: {
    default: "P2P Chess - Combine & Split Pieces Variant",
    template: "%s | P2P Chess",
  },
  description:
    "Play an innovative chess variant online: combine & split pieces (Rook+Bishop etc.), AI engine difficulty levels, and peer-to-peer WebRTC multiplayer.",
  keywords: [
    "chess variant",
    "combine pieces",
    "hybrid chess",
    "multiplayer chess",
    "AI chess engine",
    "WebRTC chess",
    "fairy chess",
    "strategy game",
    "online chess",
    "free chess",
    "browser game",
  ],
  authors: [{ name: "P2P Chess Project" }],
  creator: "P2P Chess Project",
  publisher: "P2P Chess Project",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "P2P Chess – Combine & Split Pieces",
    description:
      "Novel chess variant with hybrid piece combinations, AI engine, and realtime peer‑to‑peer play.",
    type: "website",
    url: "https://www.p2p-chess.tech/",
    siteName: "P2P Chess",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "P2P Chess – Combine & Split Pieces",
    description: "Hybrid chess variant with AI & P2P multiplayer.",
  },
};

export default function RootLayout({ children }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "P2P Chess",
        url: "https://www.p2p-chess.tech/",
        description:
          "Innovative chess variant with piece combination & splitting, AI, and peer-to-peer multiplayer.",
        inLanguage: "en",
        publisher: {
          "@type": "Organization",
          name: "P2P Chess Project",
        },
      },
      {
        "@type": "SoftwareApplication",
        name: "P2P Chess",
        applicationCategory: "GameApplication",
        operatingSystem: "Any",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        description:
          "Play an innovative chess variant online: combine & split pieces (Rook+Bishop etc.), AI engine difficulty levels, and peer‑to‑peer WebRTC multiplayer.",
      },
    ],
  };

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <SpeedInsights />
        {children}
      </body>
    </html>
  );
}
