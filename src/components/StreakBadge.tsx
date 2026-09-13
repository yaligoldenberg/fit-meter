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
      <div className="sheet flex items-center gap-3 px-5 py-3.5">
        <span className="text-lg leading-none opacity-30">🔥</span>
        <p className="text-sm text-slate">{t(locale, "streak_none")}</p>
      </div>
    );
  }

  return (
    <div
      className={`sheet flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 ${
        streak.activeToday ? "border-signal" : ""
      }`}
    >
      <span className="text-xl leading-none">🔥</span>
      <div className="flex-1">
        <p className="font-display text-3xl leading-none text-ink">
          {tn(locale, "streak_days", streak.current)}
        </p>
        <p className="mt-1 text-[13px] text-slate">
          {streak.activeToday ? t(locale, "streak_done_today") : t(locale, "streak_alive")}
        </p>
      </div>
      {streak.longest > streak.current && (
        <p className="text-[13px] text-slate-light num-tabular">
          {t(locale, "streak_best")} {streak.longest}
        </p>
      )}
    </div>
  );
}
