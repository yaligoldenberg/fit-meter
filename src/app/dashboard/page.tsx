import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { scoreWindow, trailingWindow } from "@/lib/scoring";
import { TIER_META } from "@/lib/difficulty";
import { evaluateWeekTitle, titleProgress, TitleContext } from "@/lib/weeklyTitles";
import { getAudience } from "@/lib/audience";
import { viewFor, recordEvent } from "@/lib/research";
import { computeStreak } from "@/lib/streaks";
import { computeRecords, isRecordBreaking } from "@/lib/records";
import { goalProgress, isGoalType } from "@/lib/goals";
import { t } from "@/lib/i18n";
import AppNav from "@/components/AppNav";
import ScoreGauge from "@/components/ScoreGauge";
import WorkoutForm from "@/components/WorkoutForm";
import WorkoutList from "@/components/WorkoutList";
import WeekTitleBadge from "@/components/WeekTitleBadge";
import TitleProgressBar from "@/components/TitleProgressBar";
import GenderPrompt from "@/components/GenderPrompt";
import StreakBadge from "@/components/StreakBadge";
import GoalCard from "@/components/GoalCard";
import RecordsCard from "@/components/RecordsCard";

/**
 * Last week's score and the friend nearest on the board — the two things the title copy
 * compares against. One query for the previous window, one for every friend's workouts.
 */
async function buildTitleContext(userId: string, currentStart: Date): Promise<TitleContext> {
  const previous = trailingWindow(new Date(), -1);
  const previousWorkouts = await prisma.workout.findMany({
    where: { userId, date: { gte: previous.start, lt: previous.end } },
  });
  const previousScore = scoreWindow(previousWorkouts).score;

  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    include: {
      requester: { select: { id: true, displayName: true } },
      addressee: { select: { id: true, displayName: true } },
    },
  });

  const friends = friendships.map((f) => (f.requesterId === userId ? f.addressee : f.requester));
  if (friends.length === 0) return { previousScore };

  // Both windows for everyone in one query each, so "who did I pass?" is answerable
  // without a round trip per friend.
  const ids = [userId, ...friends.map((p) => p.id)];
  const { end } = trailingWindow(new Date());
  const [nowRows, thenRows] = await Promise.all([
    prisma.workout.findMany({ where: { userId: { in: ids }, date: { gte: currentStart, lt: end } } }),
    prisma.workout.findMany({
      where: { userId: { in: ids }, date: { gte: previous.start, lt: previous.end } },
    }),
  ]);

  const effortIn = (rows: typeof nowRows, id: string) =>
    scoreWindow(rows.filter((w) => w.userId === id)).effort;

  const myEffortNow = effortIn(nowRows, userId);
  const myEffortThen = effortIn(thenRows, userId);

  const standings = friends.map((p) => ({
    name: p.displayName,
    now: effortIn(nowRows, p.id),
    then: effortIn(thenRows, p.id),
  }));

  // Ahead of you last week, behind you this week.
  const overtaken = standings
    .filter((p) => p.then > myEffortThen && p.now < myEffortNow)
    .sort((a, b) => b.now - a.now)
    .map((p) => p.name);

  const aheadOf = standings.filter((p) => p.now < myEffortNow).length;

  const nearest = [...standings].sort(
    (a, b) => Math.abs(a.now - myEffortNow) - Math.abs(b.now - myEffortNow)
  )[0];

  return {
    previousScore,
    overtaken,
    aheadOf,
    friendCount: friends.length,
    rival: {
      name: nearest.name,
      effortGap: Math.abs(nearest.now - myEffortNow),
      ahead: nearest.now > myEffortNow,
    },
  };
}

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
  const view = viewFor(user.condition);

  // Streaks and records both span the user's whole history, so one query serves both.
  const history = await prisma.workout.findMany({
    where: { userId: session.userId },
    select: { id: true, type: true, duration: true, intensity: true, distanceKm: true, date: true },
  });
  const streak = computeStreak(history);
  const records = computeRecords(history);
  const goal =
    isGoalType(user.goalType) && user.goalValue
      ? goalProgress(user.goalType, user.goalValue, result)
      : null;

  // The copy is comparative, so it needs something to compare against. Only gathered
  // for the arm that actually sees titles — the other arms must not be told where they
  // stand relative to friends, or the control is contaminated.
  const context = view.showTitles ? await buildTitleContext(session.userId, start) : {};

  const weekTitle = evaluateWeekTitle(result, audience, context);
  const progress = titleProgress(result, audience);
  const recordIds = new Set(
    workouts.filter((w) => isRecordBreaking(w, history)).map((w) => w.id)
  );
  const serializedWorkouts = workouts.map((w) => ({
    ...w,
    date: w.date.toISOString(),
    isRecord: recordIds.has(w.id),
  }));

  // Record what the participant saw — score and title are logged even when hidden
  // from this arm, since the analysis needs to compare "would have seen" vs "saw".
  await recordEvent(session.userId, "DASHBOARD_VIEW", {
    condition: user.condition,
    score: result.score,
    title: weekTitle.id,
    streak: streak.current,
  });

  return (
    <>
      <AppNav
        displayName={user.displayName}
        username={user.username}
        locale={audience.locale}
        showLeaderboard={view.showLeaderboard}
        showRanks={view.showTitles}
      />
      <main className="mx-auto max-w-5xl px-6 py-10 md:px-8">
        {audience.gender === null && <GenderPrompt locale={audience.locale} />}
        {view.showScore && (
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            <StreakBadge streak={streak} locale={audience.locale} />
            <GoalCard progress={goal} locale={audience.locale} />
          </div>
        )}
        {/* Every child here is gated, so for LOG_ONLY the whole panel would otherwise
            render as an empty bordered box that reads as a broken page. */}
        {(view.showScore || view.showTitles) && (
        <section className="rise-in flex flex-col gap-8 rounded-2xl border border-coal-600 bg-coal-800 p-6 md:flex-row md:items-center md:gap-12 md:p-8">
          {view.showScore && (
            <div className="flex flex-col items-center">
              <ScoreGauge score={result.score} grade={result.grade} />
            </div>
          )}
          <div className="flex-1">
            {view.showScore && (
              <p className="font-mono text-xs uppercase tracking-widest text-bone/50">{t(audience.locale, "score_label")}</p>
            )}

            {view.showTitles && (
              <div className="mt-5 max-w-md">
                <WeekTitleBadge weekTitle={weekTitle} />
                <TitleProgressBar progress={progress} locale={audience.locale} />
              </div>
            )}

            {view.showScore && (
              <>
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
              </>
            )}
          </div>
        </section>
        )}

        <section className="mt-8 rounded-2xl border border-coal-600 bg-coal-800 p-6 md:p-8">
          <h2 className="font-display text-2xl text-bone">{t(audience.locale, "log_workout").toUpperCase()}</h2>
          <div className="mt-5">
            <WorkoutForm locale={audience.locale} />
          </div>
        </section>

        {view.showScore && (
          <section className="mt-8">
            <RecordsCard records={records} locale={audience.locale} />
          </section>
        )}

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
