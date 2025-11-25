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

export const metadata = {
  title: "P2P Chess – Combine & Split Pieces Variant",
  description:
    "Play an innovative chess variant online: combine & split pieces (Rook+Bishop etc.), AI engine difficulty levels, and peer‑to‑peer WebRTC multiplayer.",
  keywords:
    "chess variant, combine pieces, hybrid chess, multiplayer chess, AI chess engine, WebRTC chess",
  authors: [{ name: "P2P Chess Project" }],
  themeColor: "#0d0d0d",
  openGraph: {
    title: "P2P Chess – Combine & Split Pieces",
    description:
      "Novel chess variant with hybrid piece combinations, AI engine, and realtime peer‑to‑peer play.",
    type: "website",
    url: "https://www.p2p-chess.tech/",
    images: [
      {
        url: "https://www.p2p-chess.tech/logo.svg",
        alt: "P2P Chess Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "P2P Chess – Combine & Split Pieces",
    description: "Hybrid chess variant with AI & P2P multiplayer.",
    images: ["https://www.p2p-chess.tech/logo.svg"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/logo.svg" />
        <link rel="canonical" href="https://www.p2p-chess.tech/" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
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
              potentialAction: {
                "@type": "PlayAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: "https://www.p2p-chess.tech/",
                },
              },
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SpeedInsights />
        {children}
      </body>
    </html>
  );
}
