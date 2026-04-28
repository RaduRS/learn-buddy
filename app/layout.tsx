import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono, Fredoka } from "next/font/google";
import "./globals.css";
import { ScoreProvider } from "@/hooks/useScore";
import { SoundProvider } from "@/components/sound/SoundProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#52cba0',
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://learn-buddy.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Learn Buddy - Kids Games",
    template: "%s | Learn Buddy"
  },
  description: "Educational games and activities for kids. Learn while having fun with interactive games designed for tablets and mobile devices.",
  keywords: ["kids games", "educational", "learning", "children", "tablet games", "mobile games"],
  authors: [{ name: "Learn Buddy Team" }],
  creator: "Learn Buddy",
  publisher: "Learn Buddy",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Learn Buddy",
    startupImage: [
      // iPad Pro 12.9"
      { url: "/icon-maskable-512.png", media: "(device-width: 1024px) and (device-height: 1366px) and (orientation: portrait)" },
      { url: "/icon-maskable-512.png", media: "(device-width: 1024px) and (device-height: 1366px) and (orientation: landscape)" },
      // iPad Pro 11"
      { url: "/icon-maskable-512.png", media: "(device-width: 834px) and (device-height: 1194px) and (orientation: portrait)" },
      { url: "/icon-maskable-512.png", media: "(device-width: 834px) and (device-height: 1194px) and (orientation: landscape)" },
      // iPad Air / iPad 10
      { url: "/icon-maskable-512.png", media: "(device-width: 820px) and (device-height: 1180px) and (orientation: portrait)" },
      { url: "/icon-maskable-512.png", media: "(device-width: 820px) and (device-height: 1180px) and (orientation: landscape)" },
      // iPad mini / iPad 9
      { url: "/icon-maskable-512.png", media: "(device-width: 768px) and (device-height: 1024px) and (orientation: portrait)" },
      { url: "/icon-maskable-512.png", media: "(device-width: 768px) and (device-height: 1024px) and (orientation: landscape)" },
    ],
  },
  openGraph: {
    type: "website",
    siteName: "Learn Buddy",
    title: "Learn Buddy - Kids Games",
    description: "Educational games and activities for kids",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "Learn Buddy Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Learn Buddy - Kids Games",
    description: "Educational games and activities for kids",
    images: ["/icon-512.png"],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fredoka.variable} antialiased`}
      >
        <SoundProvider>
          <ScoreProvider>
            {children}
          </ScoreProvider>
        </SoundProvider>
      </body>
    </html>
  );
}
