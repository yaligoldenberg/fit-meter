import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { scoreWeek, weekBounds } from "@/lib/scoring";
import { evaluateWeekTitle } from "@/lib/weeklyTitles";
import AppNav from "@/components/AppNav";
import ScoreGauge from "@/components/ScoreGauge";
import WorkoutForm from "@/components/WorkoutForm";
import WorkoutList from "@/components/WorkoutList";
import WeekTitleBadge from "@/components/WeekTitleBadge";

const GRADE_COPY: Record<string, string> = {
  S: "Elite week. This is the kind of number that ends group chat arguments.",
  A: "Strong week. You're setting the pace — make your friends chase it.",
  B: "Solid week. A couple more sessions and you're into A territory.",
  C: "Middling week. The board doesn't forget — get back after it.",
  D: "Quiet week. Your friends are lapping you right now.",
  F: "Nothing to show yet. Log a session and put a number on the board.",
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect("/login");

  const { start, end } = weekBounds(new Date());
  const workouts = await prisma.workout.findMany({
    where: { userId: session.userId, date: { gte: start, lt: end } },
    orderBy: { date: "desc" },
  });

  const result = scoreWeek(workouts);
  const weekTitle = evaluateWeekTitle(result, workouts);
  const serializedWorkouts = workouts.map((w) => ({
    ...w,
    date: w.date.toISOString(),
  }));

  return (
    <>
      <AppNav displayName={user.displayName} />
      <main className="mx-auto max-w-5xl px-6 py-10 md:px-8">
        <section className="rise-in flex flex-col gap-8 rounded-2xl border border-coal-600 bg-coal-800 p-6 md:flex-row md:items-center md:gap-12 md:p-8">
          <div className="flex flex-col items-center">
            <ScoreGauge score={result.score} grade={result.grade} />
          </div>
          <div className="flex-1">
            <p className="font-mono text-xs uppercase tracking-widest text-bone/50">This week&apos;s Fit Score</p>
            <p className="mt-2 max-w-md text-lg text-bone/80">{GRADE_COPY[result.grade]}</p>

            <div className="mt-5 max-w-md">
              <WeekTitleBadge weekTitle={weekTitle} />
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <StatBar label="Volume" value={result.volumePoints} max={70} />
              <StatBar label="Consistency" value={result.consistencyPoints} max={20} />
              <StatBar label="Variety" value={result.varietyPoints} max={10} />
            </div>

            <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 border-t border-coal-600 pt-5">
              <Stat label="Active days" value={`${result.activeDays}/7`} />
              <Stat label="Total minutes" value={String(result.totalMinutes)} />
              <Stat label="Workouts" value={String(result.workoutCount)} />
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-coal-600 bg-coal-800 p-6 md:p-8">
          <h2 className="font-display text-2xl text-bone">LOG A WORKOUT</h2>
          <div className="mt-5">
            <WorkoutForm />
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-coal-600 bg-coal-800 p-6 md:p-8">
          <h2 className="font-display text-2xl text-bone">THIS WEEK</h2>
          <div className="mt-5">
            <WorkoutList workouts={serializedWorkouts} />
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
