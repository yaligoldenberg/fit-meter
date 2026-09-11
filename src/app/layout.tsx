import type { Metadata } from "next";
import { Anton, Manrope, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-anton" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: "FitMeter — Your Week, Scored",
  description: "Log your workouts. Get a weekly Fit Score. Beat your friends.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${manrope.variable} ${plexMono.variable}`}>
      <body className="font-body bg-coal-900 text-bone antialiased">{children}</body>
    </html>
  );
}
