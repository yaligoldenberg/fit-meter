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
  const [type, setType] = useState<GoalType>(progress?.type ?? "WORKOUTS");
  const [value, setValue] = useState<number>(progress?.target ?? GOAL_LIMITS.WORKOUTS.suggested);

  async function save(nextType: GoalType | null, nextValue: number | null) {
    setBusy(true);
    try {
      await fetch("/api/goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: nextType, value: nextValue }),
      });
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
      <div className="rounded-xl border border-coal-600 bg-coal-800 px-5 py-4">
        <p className="font-mono text-xs uppercase tracking-widest text-bone/50">
          {t(locale, "goal_heading")}
        </p>
        {!progress && !editing && (
          <p className="mt-2 text-sm text-bone/50">{t(locale, "goal_none")}</p>
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
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    type === option
                      ? "border-volt bg-volt text-coal-950"
                      : "border-coal-600 bg-coal-900 text-bone/70 hover:border-bone/40"
                  }`}
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
                className="input w-28"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => save(type, value)}
                className="rounded-full bg-volt px-5 py-2 text-sm font-bold text-coal-950 transition hover:bg-volt-400 disabled:opacity-50"
              >
                {t(locale, "goal_save")}
              </button>
              {progress && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => save(null, null)}
                  className="text-xs text-bone/40 underline-offset-4 transition hover:text-coral hover:underline"
                >
                  {t(locale, "goal_clear")}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border px-5 py-4 ${
        progress.met ? "border-volt/40 bg-coal-700" : "border-coal-600 bg-coal-800"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-xs uppercase tracking-widest text-bone/50">
          {t(locale, "goal_heading")}
        </p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="font-mono text-xs text-bone/40 transition hover:text-bone"
        >
          {t(locale, "goal_edit")}
        </button>
      </div>

      <p className="mt-2 font-display text-xl tracking-wide text-bone num-tabular">
        {progress.current} / {progress.target}{" "}
        <span className="font-body text-sm font-normal text-bone/50">
          {t(locale, `goal_type_${progress.type}` as StringKey)}
        </span>
      </p>

      <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-coal-900">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            progress.met ? "bg-volt" : "bg-bone/60"
          }`}
          style={{ width: `${Math.max(3, progress.percent)}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-bone/50">
        {progress.met ? t(locale, "goal_met") : tn(locale, "goal_remaining", progress.remaining)}
      </p>
    </div>
  );
}
