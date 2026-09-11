"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Locale, t } from "@/lib/i18n";
import LanguageToggle from "./LanguageToggle";

const LINKS = [
  { href: "/dashboard", key: "nav_dashboard" },
  { href: "/history", key: "nav_history" },
  { href: "/leaderboard", key: "nav_leaderboard" },
  { href: "/friends", key: "nav_friends" },
] as const;

export default function AppNav({ displayName, locale }: { displayName: string; locale: Locale }) {
  const pathname = usePathname();
  const router = useRouter();

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
          {LINKS.map((link) => {
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
          <span className="hidden font-mono text-xs uppercase tracking-widest text-bone/40 sm:inline">
            {displayName}
          </span>
          <button
            onClick={logout}
            className="rounded-full border border-coal-600 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-bone/60 transition hover:border-coral hover:text-coral"
          >
            {t(locale, "nav_logout")}
          </button>
        </div>
      </div>
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-coal-600 px-4 py-2 md:hidden">
        {LINKS.map((link) => {
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
