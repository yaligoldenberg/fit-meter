"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Locale, t, tn, StringKey } from "@/lib/i18n";
import { GoalType, GOAL_TYPES, GOAL_LIMITS, GoalProgress } from "@/lib/goals";

/**
 * The participant's own weekly target, separate from the app-wide score.
 * Someone who is last on the leaderboard can still be hitting their own goal.
 */
export default function GoalCard({
  progress,
  locale,
}: {
  progress: GoalProgress | null;
  locale: Locale;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<GoalType>(progress?.type ?? "WORKOUTS");
  const [value, setValue] = useState<number>(progress?.target ?? GOAL_LIMITS.WORKOUTS.suggested);

  async function save(nextType: GoalType | null, nextValue: number | null) {
    setBusy(true);
    try {
      const res = await fetch("/api/goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: nextType, value: nextValue }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? t(locale, "generic_error"));
        return;
      }
      setError(null);
      setEditing(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function chooseType(next: GoalType) {
    setType(next);
    setValue(GOAL_LIMITS[next].suggested);
  }

  if (editing || !progress) {
    const limits = GOAL_LIMITS[type];
    return (
      <div className="sheet px-5 py-4">
        <p className="caption">{t(locale, "goal_heading")}</p>
        {!progress && !editing && (
          <p className="mt-2 text-sm text-slate">{t(locale, "goal_none")}</p>
        )}

        {(editing || !progress) && (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              {GOAL_TYPES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => chooseType(option)}
                  aria-pressed={type === option}
                  className={`chip ${type === option ? "chip-on" : ""}`}
                >
                  {t(locale, `goal_type_${option}` as StringKey)}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <input
                type="number"
                min={limits.min}
                max={limits.max}
                step={limits.step}
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="input w-24"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => save(type, value)}
                className="btn-primary"
              >
                {t(locale, "goal_save")}
              </button>
              {progress && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => save(null, null)}
                  className="text-[13px] text-slate underline-offset-4 transition-colors hover:text-flag-red hover:underline"
                >
                  {t(locale, "goal_clear")}
                </button>
              )}
            </div>
            {error && <p className="mt-2 text-[13px] text-flag-red">{error}</p>}
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`sheet px-5 py-4 ${progress.met ? "border-signal" : ""}`}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="caption">{t(locale, "goal_heading")}</p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-[13px] text-slate underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          {t(locale, "goal_edit")}
        </button>
      </div>

      <p className="mt-2 font-display text-3xl leading-none text-ink num-tabular">
        {progress.current} / {progress.target}{" "}
        <span className="font-body text-sm font-normal text-slate">
          {t(locale, `goal_type_${progress.type}` as StringKey)}
        </span>
      </p>

      <div className="meter mt-3">
        <div
          className="h-full bg-signal transition-all duration-700"
          style={{ width: `${Math.max(3, progress.percent)}%` }}
        />
      </div>

      <p className="mt-2 text-[13px] text-slate">
        {progress.met ? t(locale, "goal_met") : tn(locale, "goal_remaining", progress.remaining)}
      </p>
    </div>
  );
}
