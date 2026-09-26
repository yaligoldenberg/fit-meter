"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Locale, t } from "@/lib/i18n";

/** How long an armed button waits for the confirming tap before quietly disarming. */
const ARMED_MS = 4000;

/**
 * The "×" on a logged workout. Like the destructive actions in GroupDetailPanel, it arms
 * on the first tap and deletes on the second — a workout sits under a thumb scrolling
 * the list, and a stray tap shouldn't quietly take a session (and its points) away.
 *
 * Errors go to `onError` when the list shows them in one place, otherwise inline.
 */
export default function DeleteWorkoutButton({
  id,
  locale,
  onError,
}: {
  id: string;
  locale: Locale;
  onError?: (message: string | null) => void;
}) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A tap on a button doesn't focus it on iOS, so blur can't be relied on to disarm.
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), ARMED_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  function report(message: string | null) {
    if (onError) onError(message);
    else setError(message);
  }

  async function onClick() {
    if (!armed) {
      report(null);
      setArmed(true);
      return;
    }
    setBusy(true);
    report(null);
    try {
      const res = await fetch(`/api/workouts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        report(data.error ?? t(locale, "delete_workout_error"));
        setBusy(false);
        setArmed(false);
        return;
      }
      // Stays busy until the refreshed page drops the row.
      router.refresh();
    } catch {
      report(t(locale, "network_error"));
      setBusy(false);
      setArmed(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        aria-label={t(locale, armed ? "delete_workout_confirm" : "delete_workout")}
        className={
          armed
            ? "shrink-0 rounded-full border border-flag-red px-2.5 py-0.5 text-xs font-semibold text-flag-red disabled:opacity-30"
            : "shrink-0 rounded-full px-2 py-1 text-slate-light transition-colors hover:text-flag-red disabled:opacity-30"
        }
      >
        {busy ? "…" : armed ? t(locale, "delete_workout_confirm") : "×"}
      </button>
      {!onError && error && (
        <span role="alert" className="text-xs text-flag-red">
          {error}
        </span>
      )}
    </>
  );
}
