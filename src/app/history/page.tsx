import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAudience } from "@/lib/audience";
import { viewFor, recordEvent } from "@/lib/research";
import { scoreWindow, trailingWindow, gradeColor } from "@/lib/scoring";
import { evaluateWeekTitle, tierColor } from "@/lib/weeklyTitles";
import { t, tn, Locale } from "@/lib/i18n";
import AppNav from "@/components/AppNav";
import WeekTitleBadge from "@/components/WeekTitleBadge";
import WorkoutLog from "@/components/WorkoutLog";

function monthDayFormatter(locale: Locale) {
  return new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

const HISTORY_PAGE_SIZE = 50;

export default async function HistoryPage({
  searchParams,
}: {
  searchParams?: { page?: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { displayName: true, username: true, condition: true },
  });
  if (!user) redirect("/login");

  const audience = await getAudience();
  const view = viewFor(user.condition);
  await recordEvent(session.userId, "HISTORY_VIEW", { condition: user.condition });
  const MONTH_DAY = monthDayFormatter(audience.locale);

  const weeks = [];
  for (let i = 9; i >= 0; i--) {
    const { start, end } = trailingWindow(new Date(), -i);
    const workouts = await prisma.workout.findMany({
      where: { userId: session.userId, date: { gte: start, lt: end } },
    });
    const result = scoreWindow(workouts);
    // Titles are the study's manipulation: the control arms must not meet one here
    // either, so this page gates per field rather than redirecting like /ranks does.
    const weekTitle = view.showTitles ? evaluateWeekTitle(result, audience) : null;
    weeks.push({ start, end, isCurrent: i === 0, weekTitle, ...result });
  }
  const weeksMostRecentFirst = [...weeks].reverse();

  const totalWorkouts = await prisma.workout.count({ where: { userId: session.userId } });
  const totalPages = Math.max(1, Math.ceil(totalWorkouts / HISTORY_PAGE_SIZE));
  const requestedPage = Number(searchParams?.page ?? "1");
  const page = Number.isFinite(requestedPage)
    ? Math.min(Math.max(1, Math.floor(requestedPage)), totalPages)
    : 1;

  const allWorkouts = await prisma.workout.findMany({
    where: { userId: session.userId },
    orderBy: { date: "desc" },
    skip: (page - 1) * HISTORY_PAGE_SIZE,
    take: HISTORY_PAGE_SIZE,
  });

  const hasHistory = totalWorkouts > 0;

  return (
    <div className="min-h-screen bg-canvas">
      <AppNav
        displayName={user.displayName}
        username={user.username}
        locale={audience.locale}
        showLeaderboard={view.showLeaderboard}
        showRanks={view.showTitles}
      />
      <main className="mx-auto max-w-5xl px-6 py-10 md:px-8">
        <h1 className="font-display text-5xl leading-none text-ink md:text-6xl">
          {t(audience.locale, "history_heading")}
        </h1>
        <p className="mt-3 text-[15px] text-slate">{t(audience.locale, "history_subtitle")}</p>

        {!hasHistory ? (
          <div className="sheet mt-8 p-10 text-center">
            <p className="font-display text-3xl leading-none text-ink">
              {t(audience.locale, "history_empty_title")}
            </p>
            <p className="mt-3 text-sm text-slate">
              {t(audience.locale, "history_empty_body_pre")}
              <a href="/dashboard" className="font-semibold text-signal underline-offset-4 hover:underline">
                {t(audience.locale, "history_empty_link")}
              </a>
              {t(audience.locale, "history_empty_body_post")}
            </p>
          </div>
        ) : (
          <>
            {view.showScore && (
            <section className="sheet mt-8 p-6 md:p-8">
              <h2 className="font-display text-2xl leading-none text-ink">
                {t(audience.locale, "history_trend_heading")}
              </h2>
              <div className="mt-6 flex h-48 items-end gap-2 md:gap-3">
                {weeks.map((w) => (
                  <div key={w.start.toISOString()} className="group relative flex flex-1 flex-col items-center gap-2">
                    {w.weekTitle && (
                      <span className="text-base leading-none" title={w.weekTitle.title}>
                        {w.weekTitle.emoji}
                      </span>
                    )}
                    <span className={`font-display text-2xl leading-none ${gradeColor(w.grade)}`}>
                      {w.grade}
                    </span>
                    <div className="flex h-32 w-full items-end bg-chalk-200">
                      <div
                        className={`w-full ${w.isCurrent ? "bg-signal" : "bg-ink"}`}
                        style={{ height: `${Math.max(w.score, 3)}%` }}
                      />
                    </div>
                    <span
                      className={`text-[11px] num-tabular ${
                        w.isCurrent ? "font-semibold text-ink" : "text-slate-light"
                      }`}
                    >
                      {MONTH_DAY.format(w.start)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
            )}

            {view.showScore && (
            <section className="mt-8">
              <h2 className="font-display text-2xl leading-none text-ink">
                {t(audience.locale, "history_recap_heading")}
              </h2>
              <div className="mt-4 flex flex-col gap-3">
                {weeksMostRecentFirst
                  .filter((w) => w.workoutCount > 0 || w.isCurrent)
                  .map((w) => (
                    <div
                      key={w.start.toISOString()}
                      className="sheet flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
                    >
                      <div className="flex items-baseline gap-3 sm:w-40 sm:shrink-0">
                        <span className="text-[13px] font-medium text-slate num-tabular">
                          {MONTH_DAY.format(w.start)}
                        </span>
                        {w.isCurrent && (
                          <span className="rounded-full border border-signal px-2 py-0.5 text-[11px] font-medium text-signal">
                            {t(audience.locale, "history_current")}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        {w.weekTitle ? (
                          <>
                            <WeekTitleBadge weekTitle={w.weekTitle} compact />
                            <p className="mt-1.5 text-sm text-slate">{w.weekTitle.reason}</p>
                          </>
                        ) : (
                          <p className="text-sm text-slate">
                            {tn(audience.locale, "lb_workouts", w.workoutCount)} ·{" "}
                            {w.totalMinutes} {t(audience.locale, "unit_min")} ·{" "}
                            {tn(audience.locale, "lb_days", w.activeDays)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                        <span className={`font-display text-3xl leading-none ${gradeColor(w.grade)}`}>
                          {w.grade}
                        </span>
                        <span className="text-[13px] text-slate num-tabular">{w.score}/100</span>
                      </div>
                    </div>
                  ))}
              </div>
            </section>
            )}

            <section className="mt-8">
              <h2 className="font-display text-2xl leading-none text-ink">
                {t(audience.locale, "history_full_log_heading")}
              </h2>
              <WorkoutLog
                workouts={allWorkouts}
                locale={audience.locale}
                showNotes
                page={page}
                totalPages={totalPages}
                basePath="/history"
              />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
