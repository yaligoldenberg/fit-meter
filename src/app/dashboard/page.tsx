import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { scoreWindow, trailingWindow } from "@/lib/scoring";
import { TIER_META } from "@/lib/difficulty";
import { evaluateWeekTitle, titleProgress } from "@/lib/weeklyTitles";
import { getAudience } from "@/lib/audience";
import { t } from "@/lib/i18n";
import AppNav from "@/components/AppNav";
import ScoreGauge from "@/components/ScoreGauge";
import WorkoutForm from "@/components/WorkoutForm";
import WorkoutList from "@/components/WorkoutList";
import WeekTitleBadge from "@/components/WeekTitleBadge";
import TitleProgressBar from "@/components/TitleProgressBar";
import GenderPrompt from "@/components/GenderPrompt";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect("/login");

  const { start, end } = trailingWindow(new Date());
  const workouts = await prisma.workout.findMany({
    where: { userId: session.userId, date: { gte: start, lt: end } },
    orderBy: { date: "desc" },
  });

  const result = scoreWindow(workouts);
  const audience = await getAudience();
  const weekTitle = evaluateWeekTitle(result, audience);
  const progress = titleProgress(result, audience);
  const serializedWorkouts = workouts.map((w) => ({
    ...w,
    date: w.date.toISOString(),
  }));

  return (
    <>
      <AppNav displayName={user.displayName} locale={audience.locale} />
      <main className="mx-auto max-w-5xl px-6 py-10 md:px-8">
        {audience.gender === null && <GenderPrompt locale={audience.locale} />}
        <section className="rise-in flex flex-col gap-8 rounded-2xl border border-coal-600 bg-coal-800 p-6 md:flex-row md:items-center md:gap-12 md:p-8">
          <div className="flex flex-col items-center">
            <ScoreGauge score={result.score} grade={result.grade} />
          </div>
          <div className="flex-1">
            <p className="font-mono text-xs uppercase tracking-widest text-bone/50">{t(audience.locale, "score_label")}</p>

            <div className="mt-5 max-w-md">
              <WeekTitleBadge weekTitle={weekTitle} />
              <TitleProgressBar progress={progress} locale={audience.locale} />
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <StatBar label={t(audience.locale, "bar_volume")} value={result.volumePoints} max={70} />
              <StatBar label={t(audience.locale, "bar_consistency")} value={result.consistencyPoints} max={20} />
              <StatBar label={t(audience.locale, "bar_variety")} value={result.varietyPoints} max={10} />
            </div>

            <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 border-t border-coal-600 pt-5">
              <Stat label={t(audience.locale, "stat_active_days")} value={`${result.activeDays}/7`} />
              <Stat label={t(audience.locale, "stat_total_minutes")} value={String(result.totalMinutes)} />
              <Stat label={t(audience.locale, "stat_workouts")} value={String(result.workoutCount)} />
              <Stat label={t(audience.locale, "stat_effort")} value={String(result.effort)} />
              {result.hardest && (
                <Stat
                  label={t(audience.locale, "stat_hardest")}
                  value={`${TIER_META[result.hardest.rating.tier].label} · ${result.hardest.rating.rating}`}
                />
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-coal-600 bg-coal-800 p-6 md:p-8">
          <h2 className="font-display text-2xl text-bone">{t(audience.locale, "log_workout").toUpperCase()}</h2>
          <div className="mt-5">
            <WorkoutForm locale={audience.locale} />
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-coal-600 bg-coal-800 p-6 md:p-8">
          <h2 className="font-display text-2xl text-bone">{t(audience.locale, "last_7_days").toUpperCase()}</h2>
          <div className="mt-5">
            <WorkoutList workouts={serializedWorkouts} locale={audience.locale} />
          </div>
        </section>
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-widest text-bone/40">{label}</p>
      <p className="mt-1 font-display text-2xl text-bone num-tabular">{value}</p>
    </div>
  );
}

function StatBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-bone/40">{label}</p>
        <p className="font-mono text-xs text-bone/60 num-tabular">
          {value}/{max}
        </p>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-coal-600">
        <div className="h-full rounded-full bg-volt transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
