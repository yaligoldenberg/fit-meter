import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Anton, Manrope, IBM_Plex_Mono, Heebo } from "next/font/google";
import { LOCALE_COOKIE, DEFAULT_LOCALE, isLocale, dirFor } from "@/lib/i18n";
import "./globals.css";

const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-anton" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono" });
// Hebrew face — Manrope and Anton have no Hebrew glyphs.
const heebo = Heebo({ subsets: ["hebrew", "latin"], variable: "--font-heebo" });

export const metadata: Metadata = {
  title: "FitMeter — Your Week, Scored",
  description: "Log your workouts. Get a weekly Fit Score. Beat your friends.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  return (
    <html
      lang={locale}
      dir={dirFor(locale)}
      className={`${anton.variable} ${manrope.variable} ${plexMono.variable} ${heebo.variable}`}
    >
      <body className="font-body bg-coal-900 text-bone antialiased">{children}</body>
    </html>
  );
}
