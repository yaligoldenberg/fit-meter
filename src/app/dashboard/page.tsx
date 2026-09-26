import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { scoreWindow, trailingWindow, WindowScoreResult } from "@/lib/scoring";
import { rankPeople, LeaderboardPerson, PERSON_FIELDS } from "@/lib/leaderboard";
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
import PushToggle from "@/components/PushToggle";
import InstallPrompt from "@/components/InstallPrompt";
import { vapidPublicKey } from "@/lib/push";
import { toWorkoutTypeKey } from "@/lib/workoutTypes";
import WorkoutList from "@/components/WorkoutList";
import WeekTitleBadge from "@/components/WeekTitleBadge";
import TitleProgressBar from "@/components/TitleProgressBar";
import GenderPrompt from "@/components/GenderPrompt";
import StreakBadge from "@/components/StreakBadge";
import GoalCard from "@/components/GoalCard";
import RecordsCard from "@/components/RecordsCard";

/**
 * Last week's score and where the user stands among friends — the two things the title
 * copy compares against. Positions come from rankPeople, the same ordering the Friends
 * board on /leaderboard shows (score, then effort), so "top of the board" here is top of
 * the board there. One ranking per window, each a single query.
 */
async function buildTitleContext(me: LeaderboardPerson): Promise<TitleContext> {
  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: me.id }, { addresseeId: me.id }],
    },
    include: {
      requester: { select: PERSON_FIELDS },
      addressee: { select: PERSON_FIELDS },
    },
  });
  const friends = friendships.map((f) => (f.requesterId === me.id ? f.addressee : f.requester));

  const now = new Date();
  const people = [me, ...friends];
  const [boardNow, boardThen] = await Promise.all([
    rankPeople(people, trailingWindow(now)),
    rankPeople(people, trailingWindow(now, -1)),
  ]);

  const meNow = boardNow.find((p) => p.id === me.id)!;
  const meThen = boardThen.find((p) => p.id === me.id)!;
  const previousScore = meThen.score;
  if (friends.length === 0) return { previousScore };

  // The board breaks exact ties by name, which is ordering, not standing: nobody is
  // "passed" or "beaten" by being later in the alphabet.
  const tied = (a: WindowScoreResult, b: WindowScoreResult) => a.score === b.score && a.effort === b.effort;
  const thenById = new Map(boardThen.map((p) => [p.id, p]));
  const others = boardNow.filter((p) => p.id !== me.id);
  const behindMe = others.filter((p) => p.rank > meNow.rank && !tied(p, meNow));

  // Ahead of you last week, behind you this week — closest behind first, as the board reads.
  const overtaken = behindMe
    .filter((p) => {
      const then = thenById.get(p.id)!;
      return then.rank < meThen.rank && !tied(then, meThen);
    })
    .map((p) => p.displayName);

  // The rival is a neighbour on the board: whoever is right above, unless the one right
  // below is closer. Being chased only wins on a strictly smaller gap.
  const above = boardNow[meNow.rank - 2];
  const below = boardNow[meNow.rank];
  const closer = (a: WindowScoreResult, b: WindowScoreResult) =>
    Math.abs(a.score - meNow.score) - Math.abs(b.score - meNow.score) ||
    Math.abs(a.effort - meNow.effort) - Math.abs(b.effort - meNow.effort);
  const nearest = above && (!below || closer(above, below) <= 0) ? above : below;

  return {
    previousScore,
    overtaken,
    aheadOf: behindMe.length,
    friendCount: friends.length,
    rival: {
      name: nearest.displayName,
      scoreGap: Math.abs(nearest.score - meNow.score),
      effortGap: Math.abs(nearest.effort - meNow.effort),
      ahead: nearest.rank < meNow.rank && !tied(nearest, meNow),
    },
  };
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/api/auth/expired");

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect("/api/auth/expired");

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
    select: { id: true, type: true, duration: true, distanceKm: true, date: true },
  });
  const streak = computeStreak(history);
  // The sports this person actually logs, most recent first — one tap away in the form.
  const recentTypes = Array.from(
    new Set([...history].sort((a, b) => b.date.getTime() - a.date.getTime()).map((w) => toWorkoutTypeKey(w.type)))
  ).slice(0, 5);
  const records = computeRecords(history);
  const goal =
    isGoalType(user.goalType) && user.goalValue
      ? goalProgress(user.goalType, user.goalValue, result)
      : null;

  // The copy is comparative, so it needs something to compare against. Only gathered
  // for the arm that actually sees titles — the other arms must not be told where they
  // stand relative to friends, or the control is contaminated.
  const context = view.showTitles
    ? await buildTitleContext({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        gender: user.gender,
      })
    : {};

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
        <InstallPrompt locale={audience.locale} />
        {view.showLeaderboard && (
          <PushToggle locale={audience.locale} vapidPublicKey={vapidPublicKey()} placement="top" />
        )}
        {view.showScore && (
          <div className="mb-5 grid gap-4 md:grid-cols-2">
            <StreakBadge streak={streak} locale={audience.locale} />
            <GoalCard progress={goal} locale={audience.locale} />
          </div>
        )}
        {/* Every child here is gated, so for LOG_ONLY the whole panel would otherwise
            render as an empty bordered box that reads as a broken page. */}
        {(view.showScore || view.showTitles) && (
        <section className="rise-in sheet flex flex-col gap-8 p-6 md:flex-row md:items-center md:gap-12 md:p-9">
          {view.showScore && (
            <div className="flex flex-col items-center">
              <ScoreGauge score={result.score} grade={result.grade} />
              <p className="caption mt-4">{t(audience.locale, "score_label")}</p>
            </div>
          )}
          <div className="flex-1">
            {view.showTitles && (
              <div className="max-w-md">
                <WeekTitleBadge weekTitle={weekTitle} />
                <TitleProgressBar progress={progress} locale={audience.locale} />
              </div>
            )}

            {view.showScore && (
              <>
                <div className={`grid gap-4 sm:grid-cols-3 sm:gap-5 ${view.showTitles ? "mt-7" : ""}`}>
                  <StatBar label={t(audience.locale, "bar_volume")} value={result.volumePoints} max={70} />
                  <StatBar label={t(audience.locale, "bar_consistency")} value={result.consistencyPoints} max={20} />
                  <StatBar label={t(audience.locale, "bar_variety")} value={result.varietyPoints} max={10} />
                </div>

                <div className="mt-6 flex flex-wrap gap-x-9 gap-y-4 border-t border-rule pt-5">
                  <Stat label={t(audience.locale, "stat_active_days")} value={`${result.activeDays}/7`} />
                  <Stat label={t(audience.locale, "stat_total_minutes")} value={String(result.totalMinutes)} />
                  <Stat label={t(audience.locale, "stat_workouts")} value={String(result.workoutCount)} />
                  <Stat label={t(audience.locale, "stat_effort")} value={String(result.effort)} />
                  {result.hardest && (
                    <Stat
                      label={t(audience.locale, "stat_hardest")}
                      value={`${t(audience.locale, `difficulty_${result.hardest.rating.tier}`)} · ${result.hardest.rating.rating}`}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </section>
        )}

        <section className="sheet mt-5 p-6 md:p-9">
          <h2 className="font-display text-3xl leading-none text-ink">
            {t(audience.locale, "log_workout")}
          </h2>
          <div className="mt-6">
            <WorkoutForm locale={audience.locale} recentTypes={recentTypes} />
          </div>
        </section>


        {view.showScore && (
          <section className="mt-5">
            <RecordsCard records={records} locale={audience.locale} />
          </section>
        )}

        <section className="sheet mt-5 p-6 md:p-9">
          <h2 className="font-display text-3xl leading-none text-ink">
            {t(audience.locale, "last_7_days")}
          </h2>
          <div className="mt-6">
            <WorkoutList workouts={serializedWorkouts} locale={audience.locale} />
          </div>
        </section>

        {view.showLeaderboard && (
          <PushToggle locale={audience.locale} vapidPublicKey={vapidPublicKey()} placement="bottom" />
        )}
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="caption">{label}</p>
      <p className="mt-2 font-display text-3xl leading-none text-ink num-tabular">{value}</p>
    </div>
  );
}

function StatBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[13px] text-slate">{label}</p>
        <p className="text-[13px] text-slate num-tabular">
          {value}/{max}
        </p>
      </div>
      <div className="meter mt-2.5">
        <div className="h-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
