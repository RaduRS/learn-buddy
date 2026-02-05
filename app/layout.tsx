import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ScoreProvider } from "@/hooks/useScore";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#4f46e5',
};

export const metadata: Metadata = {
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
    statusBarStyle: "default",
    title: "Learn Buddy",
    startupImage: [
      {
        url: "/icon-512.png",
        media: "(device-width: 768px) and (device-height: 1024px)",
      },
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ScoreProvider>
          {children}
        </ScoreProvider>
      </body>
    </html>
  );
}
