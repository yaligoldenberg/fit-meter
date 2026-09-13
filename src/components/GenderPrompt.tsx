"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Locale, t } from "@/lib/i18n";

/**
 * Shown once to accounts created before gender existed — without it they'd get the
 * masculine fallback for every title and every Hebrew sentence.
 */
export default function GenderPrompt({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function choose(gender: "F" | "M") {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gender }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sheet mb-5 flex flex-wrap items-center gap-3 border-s-[3px] border-s-signal px-5 py-4">
      <p className="flex-1 text-sm text-ink">{t(locale, "gender_missing")}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => choose("F")}
          disabled={busy}
          className="chip disabled:opacity-50"
        >
          {t(locale, "gender_f")}
        </button>
        <button
          type="button"
          onClick={() => choose("M")}
          disabled={busy}
          className="chip disabled:opacity-50"
        >
          {t(locale, "gender_m")}
        </button>
      </div>
    </div>
  );
}
