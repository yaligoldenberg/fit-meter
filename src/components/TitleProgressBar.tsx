import { TitleProgress, tierColor } from "@/lib/weeklyTitles";
import { Locale, t, tn } from "@/lib/i18n";

/**
 * The two edges of the current title: the rung above and what closes the gap to it, and —
 * when the cushion is thin — the rung below and what it costs to slip.
 *
 * The downward edge is shown even at the top of the ladder, where there is no next title
 * but plenty left to lose.
 */
export default function TitleProgressBar({ progress, locale }: { progress: TitleProgress; locale: Locale }) {
  const dropWarning = progress.atRisk && progress.previous && progress.pointsToDrop !== null && (
    <div className="mt-4 rounded-lg border border-coral/30 bg-coral/5 px-3.5 py-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="rounded-full bg-coral/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-coral">
          {t(locale, "title_at_risk")}
        </span>
        <span className="text-xs text-bone/60">
          {tn(locale, "drop_points_away", progress.pointsToDrop)}
        </span>
        <span className="flex items-baseline gap-1.5">
          <span className="text-sm leading-none">{progress.previous.emoji}</span>
          <span className={`font-display text-base tracking-wide ${tierColor(progress.previous.tier)}`}>
            {progress.previous.title.toUpperCase()}
          </span>
        </span>
      </div>
      <p className="mt-1.5 text-xs text-bone/40">{t(locale, "title_hold_hint")}</p>
    </div>
  );

  if (!progress.next) {
    return (
      <>
        <p className="mt-3 font-mono text-xs uppercase tracking-widest text-volt">
          {t(locale, "top_of_ladder")}
        </p>
        {dropWarning}
      </>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-xs uppercase tracking-widest text-bone/50">{t(locale, "next_title")}</span>
        <span className="font-mono text-xs text-bone/50 num-tabular">
          {progress.pointsToNext} {t(locale, progress.pointsToNext === 1 ? "point_away" : "points_away")}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2.5">
        <span className="text-base leading-none">{progress.next.emoji}</span>
        <span className={`font-display text-lg tracking-wide ${tierColor(progress.next.tier)}`}>
          {progress.next.title.toUpperCase()}
        </span>
      </div>

      <div
        className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-coal-900"
        role="progressbar"
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progress to ${progress.next.title}`}
      >
        <div
          className="h-full rounded-full bg-volt transition-all duration-700"
          style={{ width: `${Math.max(3, progress.percent)}%` }}
        />
      </div>

      {progress.routes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {progress.routes.map((route) => (
            <span
              key={route.label}
              className="rounded-full border border-coal-600 bg-coal-900 px-3 py-1 text-xs text-bone/70"
            >
              {route.label}
              <span className="ml-1.5 font-mono text-[10px] text-volt">+{route.points}</span>
            </span>
          ))}
        </div>
      )}

      {dropWarning}
    </div>
  );
}
