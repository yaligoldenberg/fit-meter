"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Locale, LOCALES, LOCALE_COOKIE, t } from "@/lib/i18n";

/**
 * עברית / EN switch. Persists to the user record and the locale cookie, then re-renders RTL/LTR.
 *
 * The cookie is what makes this work logged-out, which is the point of the `full` variant:
 * a first-time visitor abroad lands on a Hebrew RTL page, so the pre-login surfaces need a
 * chooser that reads as a language picker rather than a two-letter pill in a nav bar.
 */
export default function LanguageToggle({
  locale,
  variant = "compact",
  tone = "dark",
}: {
  locale: Locale;
  /** `compact` is the in-nav pill; `full` spells the languages out for pre-login pages. */
  variant?: "compact" | "full";
  /** `light` for the pill sitting on the signal field. */
  tone?: "dark" | "light";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function switchTo(next: Locale) {
    // No early return when `next` is already showing: the page may be rendering the stored
    // preference with no cookie behind it, and tapping should still pin the choice.
    if (busy) return;
    setBusy(true);
    // The cookie is what the server renders from, so write it first: the switch then
    // works even when the request below fails, rather than silently doing nothing.
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
    try {
      // Only signed-in users have a record to persist to; the cookie covers the rest.
      await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
    } catch {
      // Offline or server down — the cookie already carries the change.
    } finally {
      router.refresh();
      setBusy(false);
    }
  }

  if (variant === "full") {
    return (
      <div>
        <p className="caption">{t(locale, "language_choose")}</p>
        <div className="mt-2 flex gap-2" role="group" aria-label={t(locale, "language_choose")}>
          {LOCALES.map((option) => (
            <button
              key={option}
              type="button"
              lang={option}
              dir={option === "he" ? "rtl" : "ltr"}
              onClick={() => switchTo(option)}
              disabled={busy}
              aria-pressed={locale === option}
              className={`chip flex-1 justify-center py-2.5 disabled:opacity-50 ${
                locale === option ? "chip-on" : ""
              }`}
            >
              {t(locale, option === "he" ? "language_native_he" : "language_native_en")}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-0.5 rounded-full border p-0.5 ${
        tone === "light" ? "border-paper/40" : "border-rule bg-paper"
      }`}
      role="group"
      aria-label={t(locale, "language")}
    >
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => switchTo(option)}
          disabled={busy}
          aria-pressed={locale === option}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
            locale === option
              ? tone === "light"
                ? "bg-paper text-signal"
                : "bg-signal text-paper"
              : tone === "light"
              ? "text-paper/70 hover:text-paper"
              : "text-slate hover:text-ink"
          }`}
        >
          {option === "he" ? "עב" : "EN"}
        </button>
      ))}
    </div>
  );
}
