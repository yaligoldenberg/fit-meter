"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Locale } from "@/lib/i18n";

/** עברית / EN switch. Persists to the user record and the locale cookie, then re-renders RTL/LTR. */
export default function LanguageToggle({ locale }: { locale: Locale }) {
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

  return (
    <div className="flex items-center gap-1 rounded-full border border-coal-600 bg-coal-900 p-0.5">
      {(["he", "en"] as Locale[]).map((option) => (
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
