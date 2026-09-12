"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Locale, LOCALES, t } from "@/lib/i18n";

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
}: {
  locale: Locale;
  /** `compact` is the in-nav pill; `full` spells the languages out for pre-login pages. */
  variant?: "compact" | "full";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function switchTo(next: Locale) {
    if (next === locale || busy) return;
    setBusy(true);
    try {
      await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (variant === "full") {
    return (
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-bone/50">
          {t(locale, "language_choose")}
        </p>
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
              className={`flex-1 rounded-full border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                locale === option
                  ? "border-volt bg-volt text-coal-950"
                  : "border-coal-600 bg-coal-900 text-bone/70 hover:border-bone/40"
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
      className="flex items-center gap-1 rounded-full border border-coal-600 bg-coal-900 p-0.5"
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
          className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest transition disabled:opacity-50 ${
            locale === option ? "bg-volt text-coal-950" : "text-bone/60 hover:text-bone"
          }`}
        >
          {option === "he" ? "עב" : "EN"}
        </button>
      ))}
    </div>
  );
}
