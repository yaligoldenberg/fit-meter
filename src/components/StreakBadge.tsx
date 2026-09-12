import { StreakResult } from "@/lib/streaks";
import { Locale, t, tn } from "@/lib/i18n";

/**
 * The streak counter. Deliberately loud when it's alive and quiet when it isn't —
 * the number people don't want to reset is the point, but nagging someone who has
 * no streak just reads as scolding.
 */
export default function StreakBadge({ streak, locale }: { streak: StreakResult; locale: Locale }) {
  if (streak.current === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-coal-600 bg-coal-800 px-5 py-3">
        <span className="text-xl leading-none opacity-40">🔥</span>
        <p className="text-sm text-bone/50">{t(locale, "streak_none")}</p>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border px-5 py-3 ${
        streak.activeToday ? "border-volt/40 bg-coal-700" : "border-coal-600 bg-coal-800"
      }`}
    >
      <span className="text-xl leading-none">🔥</span>
      <div className="flex-1">
        <p className="font-display text-xl tracking-wide text-volt">
          {tn(locale, "streak_days", streak.current)}
        </p>
        <p className="mt-0.5 text-xs text-bone/50">
          {streak.activeToday ? t(locale, "streak_done_today") : t(locale, "streak_alive")}
        </p>
      </div>
      {streak.longest > streak.current && (
        <p className="font-mono text-xs uppercase tracking-widest text-bone/40 num-tabular">
          {t(locale, "streak_best")} · {streak.longest}
        </p>
      )}
    </div>
  );
}
