import {
  WORKOUT_TYPES,
  toWorkoutTypeKey,
  typeLabel,
  intensityLabel,
  intensityHint,
} from "@/lib/workoutTypes";
import { rateWorkout, explainRating, TIER_META } from "@/lib/difficulty";
import { t, Locale } from "@/lib/i18n";
import DeleteWorkoutButton from "./DeleteWorkoutButton";

export interface LoggedWorkout {
  id: string;
  type: string;
  duration: number;
  distanceKm: number | null;
  note: string | null;
  date: Date;
}

function weekdayMonthDayFormatter(locale: Locale) {
  return new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * One page of workouts grouped by day, plus older/newer links — the full log on /history
 * and on a person's profile. Server-rendered; `basePath` is where the page links point.
 * `deletable` adds the owner's delete control, the only way to reach a workout that has
 * aged out of the dashboard's 7-day list.
 */
export default function WorkoutLog({
  workouts,
  locale,
  showNotes,
  page,
  totalPages,
  basePath,
  deletable = false,
}: {
  /** Newest first. */
  workouts: LoggedWorkout[];
  locale: Locale;
  /** Notes are personal: the owner and their friends see them, strangers don't. */
  showNotes: boolean;
  page: number;
  totalPages: number;
  basePath: string;
  /** Only for the owner's own log — never on someone else's profile. */
  deletable?: boolean;
}) {
  const WEEKDAY_MONTH_DAY = weekdayMonthDayFormatter(locale);

  const groups: { key: string; label: string; workouts: LoggedWorkout[] }[] = [];
  for (const w of workouts) {
    const key = w.date.toISOString().slice(0, 10);
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = { key, label: WEEKDAY_MONTH_DAY.format(w.date), workouts: [] };
      groups.push(group);
    }
    group.workouts.push(w);
  }

  return (
    <>
      <div className="sheet mt-4 p-6 md:p-8">
        {groups.map((group, gi) => (
          <div key={group.key} className={gi > 0 ? "mt-7" : ""}>
            <p className="caption">{group.label}</p>
            <div className="mt-2.5 divide-y divide-rule border-t border-rule">
              {group.workouts.map((w) => {
                const typeKey = toWorkoutTypeKey(w.type);
                const typeIcon = WORKOUT_TYPES[typeKey].icon;
                const rating = rateWorkout(w);
                const tier = TIER_META[rating.tier];
                return (
                  <div key={w.id} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="text-slate-light">{typeIcon}</span>
                    <span className="font-semibold text-ink">{typeLabel(typeKey, locale)}</span>
                    <span className="text-sm text-slate num-tabular">
                      {w.duration} {t(locale, "unit_min")}
                    </span>
                    <span title={intensityHint(rating.intensity, locale)} className="text-sm text-slate-light">
                      {intensityLabel(rating.intensity, locale)}
                    </span>
                    {w.distanceKm != null && (
                      <span className="text-sm text-slate num-tabular">
                        {w.distanceKm} {t(locale, "unit_km")}
                      </span>
                    )}
                    <span
                      title={explainRating(w, rating, locale)}
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${tier.className}`}
                    >
                      {t(locale, `difficulty_${rating.tier}`)} · {rating.rating}
                    </span>
                    {showNotes && w.note && (
                      // On phones the note drops below the row, after the delete control.
                      <span className="order-last w-full text-sm text-slate-light md:order-none md:w-auto md:flex-1 md:truncate">
                        “{w.note}”
                      </span>
                    )}
                    {deletable && (
                      <span className="ms-auto flex items-center gap-2">
                        <DeleteWorkoutButton id={w.id} locale={locale} />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          {page < totalPages ? (
            <a href={`${basePath}?page=${page + 1}`} className="text-slate underline-offset-4 hover:text-signal hover:underline">
              {t(locale, "history_older")}
            </a>
          ) : (
            <span />
          )}
          {page > 1 ? (
            <a href={`${basePath}?page=${page - 1}`} className="text-slate underline-offset-4 hover:text-signal hover:underline">
              {t(locale, "history_newer")}
            </a>
          ) : (
            <span />
          )}
        </div>
      )}
    </>
  );
}
