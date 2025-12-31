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
  metadataBase: new URL("https://combinechess.games"),
  title: {
    default: "Combine Chess - Merge & Split Pieces Online Game",
    template: "%s | Combine Chess",
  },
  description:
    "Play Combine Chess online! An innovative chess variant where you can merge pieces (Rook+Bishop, Knight+Rook) and split them tactically. Features AI engine & real-time P2P multiplayer.",
  keywords: [
    "combine chess",
    "combine chess game",
    "chess combine pieces",
    "merge chess pieces",
    "split chess pieces",
    "chess variant",
    "hybrid chess",
    "fairy chess",
    "online chess game",
    "multiplayer chess",
    "AI chess engine",
    "free chess online",
    "p2p chess",
    "WebRTC chess",
    "strategy game",
  ],
  authors: [{ name: "Combine Chess" }],
  creator: "Combine Chess",
  publisher: "Combine Chess",
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
    title: "Combine Chess – Merge & Split Pieces Game",
    description:
      "Play an innovative chess variant where you merge and split pieces! Features AI difficulty levels and real-time peer-to-peer multiplayer.",
    type: "website",
    url: "https://combinechess.games/",
    siteName: "Combine Chess",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Combine Chess – Merge & Split Pieces Game",
    description: "Innovative chess variant with piece merging, AI engine & P2P multiplayer.",
  },
};

export default function RootLayout({ children }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "Combine Chess",
        url: "https://combinechess.games/",
        description:
          "Innovative chess variant where you can merge and split pieces. Play against AI or real players online.",
        inLanguage: "en",
        publisher: {
          "@type": "Organization",
          name: "Combine Chess",
        },
      },
      {
        "@type": "SoftwareApplication",
        name: "Combine Chess",
        applicationCategory: "GameApplication",
        operatingSystem: "Any",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        description:
          "Play Combine Chess online! Merge pieces like Rook+Bishop or Knight+Rook and split them for tactical advantage. Features AI engine and real-time P2P multiplayer.",
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
