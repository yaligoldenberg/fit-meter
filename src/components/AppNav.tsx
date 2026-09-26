"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Locale, t } from "@/lib/i18n";
import LanguageToggle from "./LanguageToggle";
import ThemeToggle from "./ThemeToggle";
import Wordmark from "./Wordmark";

const LINKS = [
  { href: "/dashboard", key: "nav_dashboard" },
  { href: "/history", key: "nav_history" },
  { href: "/ranks", key: "nav_ranks" },
  { href: "/leaderboard", key: "nav_leaderboard" },
  { href: "/feed", key: "nav_feed" },
  { href: "/friends", key: "nav_friends" },
  { href: "/groups", key: "nav_groups" },
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

  const logoutButton = (extra: string) => (
    <button
      onClick={logout}
      className={`shrink-0 text-sm text-slate underline-offset-4 transition-colors hover:text-flag-red hover:underline ${extra}`}
    >
      {t(locale, "nav_logout")}
    </button>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-canvas/95 backdrop-blur">
      {/* Nothing in this row may refuse to shrink: on a 360px phone the wordmark, both
          toggles and the username only fit if the username gives way and truncates. */}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-4 sm:gap-4 md:px-8">
        <Link href="/dashboard" aria-label="FitMeter" className="shrink-0">
          <Wordmark size="text-xl sm:text-2xl" />
        </Link>
        {/* Seven links plus the account cluster need about 950px, so tablets in
            portrait get the phone strip below rather than a squeezed row. */}
        <nav className="hidden items-center gap-6 lg:flex">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`border-b-2 pb-0.5 text-sm transition-colors ${
                  active
                    ? "border-signal font-semibold text-ink"
                    : "border-transparent text-slate hover:text-ink"
                }`}
              >
                {t(locale, link.key)}
              </Link>
            );
          })}
        </nav>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link
            href="/profile"
            aria-label={`${displayName} (@${username}) — ${t(locale, "nav_profile_link")}`}
            title={t(locale, "nav_profile_link")}
            aria-current={pathname === "/profile" ? "page" : undefined}
            className="group min-w-0 max-w-[8rem] text-end leading-tight sm:max-w-[11rem]"
          >
            <span className="hidden truncate text-[13px] font-semibold text-ink underline-offset-4 group-hover:underline sm:block">
              {displayName}
            </span>
            <span className="block truncate text-xs text-slate underline-offset-4 group-hover:text-ink group-hover:underline">
              @{username}
            </span>
          </Link>
          <div className="shrink-0">
            <LanguageToggle locale={locale} />
          </div>
          <div className="shrink-0">
            <ThemeToggle locale={locale} />
          </div>
          {/* On phones this moves down to the link strip, where there is room for it. */}
          {logoutButton("hidden lg:block")}
        </div>
      </div>
      <div className="flex items-center border-t border-rule lg:hidden">
        <nav className="flex min-w-0 flex-1 items-center gap-5 overflow-x-auto px-6 py-2.5">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap border-b-2 pb-0.5 text-sm ${
                  active ? "border-signal font-semibold text-ink" : "border-transparent text-slate"
                }`}
              >
                {t(locale, link.key)}
              </Link>
            );
          })}
        </nav>
        <div className="border-s border-rule px-4 py-2.5">{logoutButton("")}</div>
      </div>
    </header>
  );
}
