import { TitleProgress, tierColor } from "@/lib/weeklyTitles";
import { Locale, t } from "@/lib/i18n";

/** Shows the next title on the ladder and exactly what closes the gap to it. */
export default function TitleProgressBar({ progress, locale }: { progress: TitleProgress; locale: Locale }) {
  if (!progress.next) {
    return (
      <p className="mt-3 font-mono text-xs uppercase tracking-widest text-volt">
        {t(locale, "top_of_ladder")}
      </p>
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
    </div>
  );
}
