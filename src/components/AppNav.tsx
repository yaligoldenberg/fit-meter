"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Locale, t } from "@/lib/i18n";
import LanguageToggle from "./LanguageToggle";

const LINKS = [
  { href: "/dashboard", key: "nav_dashboard" },
  { href: "/history", key: "nav_history" },
  { href: "/ranks", key: "nav_ranks" },
  { href: "/leaderboard", key: "nav_leaderboard" },
  { href: "/feed", key: "nav_feed" },
  { href: "/friends", key: "nav_friends" },
] as const;

/** Social surfaces hidden together for study arms that must not reach them. */
const SOCIAL_HREFS = ["/leaderboard", "/feed"];

/** The title ladder, hidden from arms that see no titles at all. */
const TITLE_HREFS = ["/ranks"];

export default function AppNav({
  displayName,
  username,
  locale,
  showLeaderboard = true,
  showRanks = true,
}: {
  displayName: string;
  /** Shown in the header because it is what people log in with, and the one thing
      about their own account they have no other way to look up. */
  username: string;
  locale: Locale;
  /** Hide the Leaderboard link for study arms that must not reach it. Defaults to true. */
  showLeaderboard?: boolean;
  /** Hide the Ranks link for study arms that see no titles. Defaults to true. */
  showRanks?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const links = LINKS.filter(
    (link) =>
      (showLeaderboard || !SOCIAL_HREFS.includes(link.href)) &&
      (showRanks || !TITLE_HREFS.includes(link.href))
  );

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-coal-600 bg-coal-900/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-8">
        <Link href="/dashboard" className="font-display text-xl tracking-wide text-bone">
          FIT<span className="text-volt">METER</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active ? "bg-volt text-coal-950" : "text-bone/60 hover:text-bone"
                }`}
              >
                {t(locale, link.key)}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <LanguageToggle locale={locale} />
          <div className="max-w-[8rem] text-end leading-tight sm:max-w-[11rem]">
            <span className="hidden truncate font-mono text-xs uppercase tracking-widest text-bone/40 sm:block">
              {displayName}
            </span>
            <span
              className="block truncate font-mono text-[11px] text-bone/30"
              title={t(locale, "nav_your_username")}
            >
              @{username}
            </span>
          </div>
          <button
            onClick={logout}
            className="rounded-full border border-coal-600 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-bone/60 transition hover:border-coral hover:text-coral"
          >
            {t(locale, "nav_logout")}
          </button>
        </div>
      </div>
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-coal-600 px-4 py-2 md:hidden">
        {links.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
                active ? "bg-volt text-coal-950" : "text-bone/60"
              }`}
            >
              {t(locale, link.key)}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
