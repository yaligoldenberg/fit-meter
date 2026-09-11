import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAudience } from "@/lib/audience";
import { scoreWindow, trailingWindow, gradeColor } from "@/lib/scoring";
import { evaluateWeekTitle, tierColor } from "@/lib/weeklyTitles";
import {
  WORKOUT_TYPES,
  INTENSITIES,
  WorkoutTypeKey,
  IntensityKey,
  typeLabel,
  intensityLabel,
} from "@/lib/workoutTypes";
import { rateWorkout, explainRating, TIER_META } from "@/lib/difficulty";
import { t, Locale } from "@/lib/i18n";
import AppNav from "@/components/AppNav";
import WeekTitleBadge from "@/components/WeekTitleBadge";

function monthDayFormatter(locale: Locale) {
  return new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function weekdayMonthDayFormatter(locale: Locale) {
  return new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default async function HistoryPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { displayName: true },
  });
  if (!user) redirect("/login");

  const audience = await getAudience();
  const MONTH_DAY = monthDayFormatter(audience.locale);
  const WEEKDAY_MONTH_DAY = weekdayMonthDayFormatter(audience.locale);

  const weeks = [];
  for (let i = 9; i >= 0; i--) {
    const { start, end } = trailingWindow(new Date(), -i);
    const workouts = await prisma.workout.findMany({
      where: { userId: session.userId, date: { gte: start, lt: end } },
    });
    const result = scoreWindow(workouts);
    const weekTitle = evaluateWeekTitle(result, audience);
    weeks.push({ start, end, isCurrent: i === 0, weekTitle, ...result });
  }
  const weeksMostRecentFirst = [...weeks].reverse();

  const allWorkouts = await prisma.workout.findMany({
    where: { userId: session.userId },
    orderBy: { date: "desc" },
    take: 200,
  });

  const groups: { key: string; label: string; workouts: typeof allWorkouts }[] = [];
  for (const w of allWorkouts) {
    const key = w.date.toISOString().slice(0, 10);
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = { key, label: WEEKDAY_MONTH_DAY.format(w.date), workouts: [] };
      groups.push(group);
    }
    group.workouts.push(w);
  }

  const hasHistory = allWorkouts.length > 0;

  return (
    <div className="min-h-screen bg-coal-900">
      <AppNav displayName={user.displayName} locale={audience.locale} />
      <main className="mx-auto max-w-5xl px-6 py-10 md:px-8">
        <h1 className="font-display text-4xl text-bone md:text-5xl">{t(audience.locale, "history_heading")}</h1>
        <p className="mt-2 text-sm text-bone/60">{t(audience.locale, "history_subtitle")}</p>

        {!hasHistory ? (
          <div className="mt-10 rounded-2xl border border-coal-600 bg-coal-800 p-10 text-center">
            <p className="font-display text-2xl text-bone">{t(audience.locale, "history_empty_title")}</p>
            <p className="mt-2 text-sm text-bone/60">
              {t(audience.locale, "history_empty_body_pre")}
              <a href="/dashboard" className="font-semibold text-volt">
                {t(audience.locale, "history_empty_link")}
              </a>
              {t(audience.locale, "history_empty_body_post")}
            </p>
          </div>
        ) : (
          <>
            <section className="mt-8 rounded-2xl border border-coal-600 bg-coal-800 p-6 md:p-8">
              <h2 className="font-mono text-xs uppercase tracking-widest text-bone/50">
                {t(audience.locale, "history_trend_heading")}
              </h2>
              <div className="mt-6 flex h-48 items-end gap-2 md:gap-3">
                {weeks.map((w) => (
                  <div key={w.start.toISOString()} className="group relative flex flex-1 flex-col items-center gap-2">
                    <span className="text-base leading-none" title={w.weekTitle.title}>
                      {w.weekTitle.emoji}
                    </span>
                    <span className={`font-display text-lg ${gradeColor(w.grade)}`}>{w.grade}</span>
                    <div className="flex h-32 w-full items-end overflow-hidden rounded-t-md bg-coal-700">
                      <div
                        className={`w-full rounded-t-md ${w.isCurrent ? "bg-volt" : "bg-volt/50"}`}
                        style={{ height: `${Math.max(w.score, 3)}%` }}
                      />
                    </div>
                    <span
                      className={`font-mono text-[10px] ${
                        w.isCurrent ? "text-bone" : "text-bone/40"
                      }`}
                    >
                      {MONTH_DAY.format(w.start)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-8">
              <h2 className="font-mono text-xs uppercase tracking-widest text-bone/50">
                {t(audience.locale, "history_recap_heading")}
              </h2>
              <div className="mt-4 flex flex-col gap-3">
                {weeksMostRecentFirst
                  .filter((w) => w.workoutCount > 0 || w.isCurrent)
                  .map((w) => (
                    <div
                      key={w.start.toISOString()}
                      className="flex flex-col gap-3 rounded-2xl border border-coal-600 bg-coal-800 p-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
                    >
                      <div className="flex items-baseline gap-3 sm:w-40 sm:shrink-0">
                        <span className="font-mono text-xs uppercase tracking-widest text-bone/40">
                          {MONTH_DAY.format(w.start)}
                        </span>
                        {w.isCurrent && (
                          <span className="rounded-full bg-volt/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-volt">
                            {t(audience.locale, "history_current")}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <WeekTitleBadge weekTitle={w.weekTitle} compact />
                        <p className="mt-1.5 text-sm text-bone/60">{w.weekTitle.reason}</p>
                      </div>
                      <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                        <span className={`font-display text-2xl ${gradeColor(w.grade)}`}>{w.grade}</span>
                        <span className="font-mono text-xs text-bone/40 num-tabular">{w.score}/100</span>
                      </div>
                    </div>
                  ))}
              </div>
            </section>

            <section className="mt-8">
              <h2 className="font-mono text-xs uppercase tracking-widest text-bone/50">
                {t(audience.locale, "history_full_log_heading")}
              </h2>
              <div className="mt-4 rounded-2xl border border-coal-600 bg-coal-800 p-6 md:p-8">
                {groups.map((group, gi) => (
                  <div key={group.key} className={gi > 0 ? "mt-6" : ""}>
                    <p className="font-mono text-xs uppercase tracking-widest text-bone/40">{group.label}</p>
                    <div className="mt-2 divide-y divide-coal-600">
                      {group.workouts.map((w) => {
                        const typeKey = (w.type in WORKOUT_TYPES ? w.type : "OTHER") as WorkoutTypeKey;
                        const intensityKey = (w.intensity in INTENSITIES ? w.intensity : "MEDIUM") as IntensityKey;
                        const typeIcon = WORKOUT_TYPES[typeKey].icon;
                        const rating = rateWorkout(w);
                        const tier = TIER_META[rating.tier];
                        return (
                          <div key={w.id} className="flex flex-wrap items-center gap-3 py-3">
                            <span className="text-volt">{typeIcon}</span>
                            <span className="font-semibold text-bone">{typeLabel(typeKey, audience.locale)}</span>
                            <span className="font-mono text-sm text-bone/50 num-tabular">
                              {w.duration} {t(audience.locale, "unit_min")}
                            </span>
                            <span className="font-mono text-xs uppercase tracking-widest text-bone/40">
                              {intensityLabel(intensityKey, audience.locale)}
                            </span>
                            {w.distanceKm != null && (
                              <span className="font-mono text-sm text-bone/50 num-tabular">
                                {w.distanceKm} {t(audience.locale, "unit_km")}
                              </span>
                            )}
                            <span
                              title={explainRating(w, rating, audience.locale)}
                              className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${tier.className}`}
                            >
                              {t(audience.locale, `difficulty_${rating.tier}`)} · {rating.rating}
                            </span>
                            {w.note && (
                              <span className="w-full text-sm text-bone/40 md:w-auto md:flex-1 md:truncate">
                                “{w.note}”
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
