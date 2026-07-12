import type { Metadata } from "next";
import {
  IBM_Plex_Sans,
  IBM_Plex_Sans_Devanagari,
  IBM_Plex_Mono,
} from "next/font/google";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
});

const plexDevanagari = IBM_Plex_Sans_Devanagari({
  subsets: ["devanagari", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-devanagari",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "GMB सारथी",
  description: "Agency GMB audit & ops dashboard — Karad",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="mr">
      <body
        className={`${plexSans.variable} ${plexDevanagari.variable} ${plexMono.variable} bg-bg-app font-sans text-ink antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
