import Link from "next/link";
import { WORKOUT_TYPE_ORDER, WORKOUT_TYPES, typeLabel } from "@/lib/workoutTypes";
import { getAudience } from "@/lib/audience";
import { Locale, t } from "@/lib/i18n";
import LanguageToggle from "@/components/LanguageToggle";
import ThemeToggle from "@/components/ThemeToggle";
import Wordmark from "@/components/Wordmark";

const SAMPLE_BOARD = [
  { rank: 1, name: "Dana K.", grade: "S", score: 96 },
  { rank: 2, name: "You", grade: "A", score: 84 },
  { rank: 3, name: "Marco T.", grade: "B", score: 71 },
  { rank: 4, name: "Priya R.", grade: "C", score: 58 },
];

export default async function LandingPage() {
  const { locale } = await getAudience();

  return (
    <main className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 border-b border-rule bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4 md:px-10">
          <Wordmark />
          <nav className="flex items-center gap-3">
            <LanguageToggle locale={locale} />
            <ThemeToggle locale={locale} />
            <Link
              href="/login"
              className="text-sm font-semibold text-slate transition-colors hover:text-ink"
            >
              {t(locale, "login")}
            </Link>
            <Link href="/register" className="btn-primary">
              {t(locale, "land_signup")}
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-16 md:grid-cols-[1.1fr_0.9fr] md:gap-16 md:px-10 md:py-24">
        <div className="text-start">
          <p className="caption rise-in">{t(locale, "land_kicker")}</p>
          <h1
            className="rise-in mt-6 font-display text-[3.75rem] leading-[0.95] text-ink sm:text-[4.75rem] md:text-[5.5rem]"
            style={{ animationDelay: "60ms" }}
          >
            {t(locale, "land_h1_a")}
            <br />
            {t(locale, "land_h1_b")}
          </h1>
          <p
            className="rise-in mt-7 max-w-[48ch] text-[17px] leading-relaxed text-slate"
            style={{ animationDelay: "120ms" }}
          >
            {t(locale, "land_sub")}
          </p>
          <div
            className="rise-in mt-9 flex flex-col gap-3 sm:flex-row"
            style={{ animationDelay: "180ms" }}
          >
            <Link href="/register" className="btn-primary px-7 py-3.5 text-base">
              {t(locale, "land_cta")}
            </Link>
            <Link href="/login" className="btn-quiet px-7 py-3.5 text-base">
              {t(locale, "land_have_account")}
            </Link>
          </div>
        </div>

        <Specimen locale={locale} />
      </section>

      {/* What the app measures, stated plainly rather than scrolled past. */}
      <div className="border-y border-rule bg-chalk">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-7 gap-y-3 px-6 py-5 md:px-10">
          {WORKOUT_TYPE_ORDER.slice(0, 9).map((key) => (
            <span key={key} className="flex items-center gap-2 text-sm font-medium text-slate">
              <span className="text-signal">{WORKOUT_TYPES[key].icon}</span>
              {typeLabel(key, locale)}
            </span>
          ))}
          <span className="text-sm text-slate-light">+{WORKOUT_TYPE_ORDER.length - 9}</span>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-24">
        <h2 className="font-display text-[2.75rem] leading-[1.05] text-ink md:text-[3.25rem]">
          {t(locale, "land_how")}
        </h2>
        <div className="lattice mt-10 md:grid-cols-3">
          {[
            { title: t(locale, "land_s1_title"), body: t(locale, "land_s1_body") },
            { title: t(locale, "land_s2_title"), body: t(locale, "land_s2_body") },
            { title: t(locale, "land_s3_title"), body: t(locale, "land_s3_body") },
          ].map((step, i) => (
            <div key={step.title}>
              <span className="caption text-signal num-tabular">{`0${i + 1}`}</span>
              <h3 className="mt-5 font-display text-2xl leading-tight text-ink">{step.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-slate">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The one inverted field. The leaderboard is the part people argue about, so it
          gets the high-contrast treatment rather than a generic call-to-action band. */}
      <section className="invert-field">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:gap-16 md:px-10 md:py-24">
          <div className="text-start">
            <p className="caption">{t(locale, "land_preview")}</p>
            <h2 className="mt-5 font-display text-[2.75rem] leading-[1.05] text-paper md:text-[3.25rem]">
              {t(locale, "land_squad")}
            </h2>
            <p className="mt-5 max-w-[44ch] text-[15px] leading-relaxed text-slate-light">
              {t(locale, "land_s3_body")}
            </p>
            <Link href="/register" className="btn-signal mt-8 px-7 py-3.5 text-base">
              {t(locale, "land_cta")}
            </Link>
          </div>

          <div className="rounded-sheet border border-rule-dark bg-ink-800">
            {SAMPLE_BOARD.map((row, i) => (
              <div
                key={row.rank}
                className={`flex items-center gap-4 px-5 py-4 ${
                  i > 0 ? "border-t border-rule-dark" : ""
                } ${row.name === "You" ? "bg-ink-700" : ""}`}
              >
                <span className="w-5 text-sm text-slate-light num-tabular">{row.rank}</span>
                <span className="flex-1 font-semibold text-paper">{row.name}</span>
                <span
                  className={`font-display text-2xl leading-none ${
                    row.grade === "S" ? "text-signal-400" : "text-paper"
                  }`}
                >
                  {row.grade}
                </span>
                <span className="w-10 text-end text-sm text-slate-light num-tabular">
                  {row.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 md:px-10">
          <Wordmark size="text-xl" />
          <p className="text-sm text-slate-light">{t(locale, "land_footer")}</p>
        </div>
      </footer>
    </main>
  );
}

/**
 * A filled-in scorecard, shown rather than described. It is the object the whole product
 * produces, so the landing page leads with one instead of an abstract illustration.
 */
function Specimen({ locale }: { locale: Locale }) {
  const bars = [
    { label: t(locale, "bar_volume"), value: 58, max: 70 },
    { label: t(locale, "bar_consistency"), value: 18, max: 20 },
    { label: t(locale, "bar_variety"), value: 8, max: 10 },
  ];

  return (
    <div className="rise-in sheet shadow-lift" style={{ animationDelay: "240ms" }}>
      <div className="border-b border-rule px-6 py-4">
        <span className="caption">{t(locale, "score_label")}</span>
      </div>

      <div className="flex items-end justify-between px-6 py-6">
        <p className="readout text-[4.5rem] text-ink">84</p>
        <span className="font-display text-[3.5rem] leading-none text-signal">A</span>
      </div>

      <dl className="space-y-4 border-t border-rule px-6 py-6">
        {bars.map((bar) => (
          <div key={bar.label}>
            <div className="flex items-baseline justify-between">
              <dt className="text-[13px] font-medium text-slate">{bar.label}</dt>
              <dd className="text-[13px] text-slate num-tabular">
                {bar.value}/{bar.max}
              </dd>
            </div>
            <div className="meter mt-2">
              <div style={{ width: `${(bar.value / bar.max) * 100}%` }} />
            </div>
          </div>
        ))}
      </dl>

      <div className="flex items-baseline justify-between border-t border-rule px-6 py-4 text-[13px] text-slate">
        <span>{t(locale, "stat_active_days")}</span>
        <span className="num-tabular">5/7</span>
      </div>
    </div>
  );
}
