import { LadderRung, tierColor, tierBorder } from "@/lib/weeklyTitles";
import { Locale, Gender, t, tn } from "@/lib/i18n";

/**
 * The full title ladder, highest rung first.
 *
 * Both gendered forms are printed on every rung for every viewer. That is deliberate:
 * the titles are the study's manipulation, and a participant who can only see half the
 * ladder can't judge what the app is actually offering. The viewer's own form is marked,
 * not filtered — nobody is shown a smaller ladder than anyone else.
 */
export default function RankLadder({
  ladder,
  locale,
  gender,
  score,
  currentIndex,
  atRisk = false,
}: {
  ladder: LadderRung[];
  locale: Locale;
  gender: Gender | null;
  /** The viewer's rolling 7-day score, used only to mark unlocked rungs. */
  score: number;
  currentIndex: number;
  /** Whether the current rung is close to slipping — the window rolls, so titles are held, not owned. */
  atRisk?: boolean;
}) {
  const descending = [...ladder].reverse();

  return (
    <ol className="flex flex-col gap-3">
      {descending.map((rung) => {
        const index = ladder.findIndex((r) => r.id === rung.id);
        const unlocked = score >= rung.minScore;
        const isCurrent = index === currentIndex;
        const isNext = index === currentIndex + 1;
        const sameForm = rung.titleF === rung.titleM;

        return (
          <li
            key={rung.id}
            aria-current={isCurrent ? "step" : undefined}
            className={`rounded-2xl border bg-coal-800 p-5 transition md:p-6 ${
              isCurrent ? tierBorder(rung.tier) : "border-coal-600"
            } ${unlocked ? "" : "opacity-70"}`}
          >
            <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
              <span className={`text-2xl leading-none ${unlocked ? "" : "grayscale"}`} aria-hidden="true">
                {rung.emoji}
              </span>

              <div className="min-w-[12rem] flex-1">
                {sameForm ? (
                  <p className={`font-display text-xl tracking-wide ${tierColor(rung.tier)}`}>
                    {rung.titleF.toUpperCase()}
                  </p>
                ) : (
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <TitleForm
                      label={t(locale, "ranks_form_f")}
                      title={rung.titleF}
                      tier={rung.tier}
                      own={gender === "F"}
                    />
                    <span className="text-bone/20" aria-hidden="true">
                      /
                    </span>
                    <TitleForm
                      label={t(locale, "ranks_form_m")}
                      title={rung.titleM}
                      tier={rung.tier}
                      own={gender === "M"}
                    />
                  </div>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {isCurrent && (
                    <span className="rounded-full bg-volt px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-coal-950">
                      {t(locale, "ranks_you_are_here")}
                    </span>
                  )}
                  {isCurrent && atRisk && (
                    <span className="rounded-full border border-coral/40 bg-coral/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-coral">
                      {t(locale, "title_at_risk")}
                    </span>
                  )}
                  {isNext && (
                    <span className="rounded-full border border-volt/50 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-volt">
                      {t(locale, "ranks_next_up")}
                    </span>
                  )}
                  <span
                    className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest ${
                      unlocked ? "border-coal-600 text-bone/50" : "border-coal-600 text-bone/30"
                    }`}
                  >
                    {t(locale, unlocked ? "ranks_unlocked" : "ranks_locked")}
                  </span>
                </div>
              </div>

              <div className="text-end">
                <p className="font-mono text-[10px] uppercase tracking-widest text-bone/40">
                  {t(locale, "ranks_score_needed")}
                </p>
                <p className="font-display text-3xl text-bone num-tabular">{rung.minScore}</p>
              </div>
            </div>

            {/* The bottom rung is the default — there is nothing to do to earn it. */}
            {rung.minScore > 0 && (
              <div className="mt-4 border-t border-coal-600 pt-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-bone/40">
                  {t(locale, "ranks_what_it_takes")}
                </p>
                <ul className="mt-2 flex flex-col gap-1.5 text-sm text-bone/60">
                  <li>
                    {rung.requirement.effortWithFullHabit === 0
                      ? t(locale, "ranks_route_habit_free")
                      : tn(locale, "ranks_route_habit", rung.requirement.minutesWithFullHabit)}
                  </li>
                  <li>
                    {rung.requirement.minutesVolumeOnly === null
                      ? t(locale, "ranks_route_volume_impossible")
                      : tn(locale, "ranks_route_volume", rung.requirement.minutesVolumeOnly)}
                  </li>
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** One grammatical form of a title, with the viewer's own form picked out. */
function TitleForm({
  label,
  title,
  tier,
  own,
}: {
  label: string;
  title: string;
  tier: LadderRung["tier"];
  own: boolean;
}) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className={`font-display text-xl tracking-wide ${own ? tierColor(tier) : "text-bone/50"}`}>
        {title.toUpperCase()}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-widest text-bone/30">{label}</span>
    </span>
  );
}
