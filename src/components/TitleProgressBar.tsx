import { TitleProgress, tierColor } from "@/lib/weeklyTitles";
import { Locale, t, tn } from "@/lib/i18n";

/**
 * The two edges of the current title: the rung above and what closes the gap to it, and —
 * when the cushion is thin — the rung below and what it costs to slip.
 *
 * The downward edge is shown even at the top of the ladder, where there is no next title
 * but plenty left to lose.
 */
export default function TitleProgressBar({
  progress,
  locale,
}: {
  progress: TitleProgress;
  locale: Locale;
}) {
  const dropWarning = progress.atRisk && progress.previous && progress.pointsToDrop !== null && (
    <div className="mt-4 border-s-[3px] border-flag-red bg-chalk py-2.5 ps-3.5 pe-3.5">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-[13px] font-semibold text-flag-red">{t(locale, "title_at_risk")}</span>
        <span className="text-[13px] text-slate">
          {tn(locale, "drop_points_away", progress.pointsToDrop)}
        </span>
        <span className="flex items-baseline gap-1.5">
          <span className="text-sm leading-none">{progress.previous.emoji}</span>
          <span className={`font-display text-xl leading-none ${tierColor(progress.previous.tier)}`}>
            {progress.previous.title}
          </span>
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-light">{t(locale, "title_hold_hint")}</p>
    </div>
  );

  if (!progress.next) {
    return (
      <>
        <p className="mt-3 text-[13px] font-semibold text-signal">{t(locale, "top_of_ladder")}</p>
        {dropWarning}
      </>
    );
  }

  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="caption">{t(locale, "next_title")}</span>
        <span className="text-[13px] text-slate num-tabular">
          {progress.pointsToNext} {t(locale, progress.pointsToNext === 1 ? "point_away" : "points_away")}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2.5">
        <span className="text-base leading-none">{progress.next.emoji}</span>
        <span className={`font-display text-2xl leading-none ${tierColor(progress.next.tier)}`}>
          {progress.next.title}
        </span>
      </div>

      <div
        className="meter mt-2.5"
        role="progressbar"
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progress to ${progress.next.title}`}
      >
        <div
          className="h-full transition-all duration-700"
          style={{ width: `${Math.max(3, progress.percent)}%` }}
        />
      </div>

      {progress.routes.length > 0 && (
        <div className="mt-3.5 flex flex-wrap gap-2">
          {progress.routes.map((route) => (
            <span
              key={route.label}
              className="rounded-full border border-rule px-3 py-1 text-[13px] text-slate"
            >
              {route.label}
              <span className="ms-1.5 font-semibold text-signal num-tabular">+{route.points}</span>
            </span>
          ))}
        </div>
      )}

      {dropWarning}
    </div>
  );
}
