import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { scoreWindow, trailingWindow } from "@/lib/scoring";
import { titleLadder, ladderIndexFor, titleProgress } from "@/lib/weeklyTitles";
import { getAudience } from "@/lib/audience";
import { viewFor, recordEvent } from "@/lib/research";
import { t } from "@/lib/i18n";
import AppNav from "@/components/AppNav";
import RankLadder from "@/components/RankLadder";

/**
 * The rank list: every title on offer, what unlocks it, and which ones the viewer has.
 *
 * Titles are the study's manipulation, so this page belongs to the TITLES arm alone —
 * the other arms must never see the ladder, not even by typing the URL.
 */
export default async function RanksPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect("/login");

  const view = viewFor(user.condition);
  if (!view.showTitles) redirect("/dashboard");

  const audience = await getAudience();
  const { start, end } = trailingWindow(new Date());
  const workouts = await prisma.workout.findMany({
    where: { userId: session.userId, date: { gte: start, lt: end } },
  });

  const result = scoreWindow(workouts);
  const ladder = titleLadder(audience.locale);
  const currentIndex = ladderIndexFor(result.score);
  const unlockedCount = ladder.filter((rung) => result.score >= rung.minScore).length;
  // Costs no extra query — the window result is already in hand.
  const progress = titleProgress(result, audience);

  await recordEvent(session.userId, "RANKS_VIEW", {
    condition: user.condition,
    score: result.score,
    rung: ladder[currentIndex].id,
    unlockedCount,
    atRisk: progress.atRisk,
    pointsToDrop: progress.pointsToDrop,
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
      <main className="mx-auto max-w-4xl px-6 py-10 md:px-8">
        <header className="rise-in">
          <h1 className="font-display text-5xl leading-none text-ink md:text-6xl">
            {t(audience.locale, "ranks_heading")}
          </h1>
          <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-slate">
            {t(audience.locale, "ranks_sub")}
          </p>
        </header>

        <section className="mt-6 flex flex-wrap gap-4">
          <Summary
            label={t(audience.locale, "ranks_your_score")}
            value={`${result.score}/100`}
          />
          <Summary
            label={t(audience.locale, "ranks_unlocked_label")}
            value={`${unlockedCount}/${ladder.length}`}
          />
        </section>

        <p className="mt-5 border-s-[3px] border-rule bg-chalk px-4 py-3 text-[13px] leading-relaxed text-slate">
          {t(audience.locale, "ranks_both_forms_note")}
        </p>

        <section className="mt-6">
          <RankLadder
            ladder={ladder}
            locale={audience.locale}
            gender={audience.gender}
            score={result.score}
            currentIndex={currentIndex}
            atRisk={progress.atRisk}
          />
        </section>
      </main>
    </>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="sheet px-5 py-3.5">
      <p className="caption">{label}</p>
      <p className="mt-2 font-display text-3xl leading-none text-ink num-tabular">{value}</p>
    </div>
  );
}
