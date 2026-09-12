import Link from "next/link";
import { WORKOUT_TYPE_ORDER, WORKOUT_TYPES, typeLabel } from "@/lib/workoutTypes";
import { getAudience } from "@/lib/audience";
import { t } from "@/lib/i18n";
import LanguageToggle from "@/components/LanguageToggle";

const SAMPLE_BOARD = [
  { rank: 1, name: "Dana K.", grade: "S", score: 96 },
  { rank: 2, name: "You", grade: "A", score: 84 },
  { rank: 3, name: "Marco T.", grade: "B", score: 71 },
  { rank: 4, name: "Priya R.", grade: "C", score: 58 },
];

const gradeStyles: Record<string, string> = {
  S: "text-volt",
  A: "text-volt",
  B: "text-bone",
  C: "text-bone/70",
};

export default async function LandingPage() {
  const { locale } = await getAudience();

  return (
    <main className="min-h-screen bg-coal-900">
      <header className="flex items-center justify-between px-6 py-6 md:px-12">
        <div className="font-display text-2xl tracking-wide text-bone">
          FIT<span className="text-volt">METER</span>
        </div>
        <nav className="flex items-center gap-3">
          <LanguageToggle locale={locale} />
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm font-semibold text-bone/80 transition hover:text-bone"
          >
            {t(locale, "login")}
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-volt px-5 py-2 text-sm font-bold text-coal-950 transition hover:bg-volt-400"
          >
            {t(locale, "land_signup")}
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-coal-950 bg-noise diagonal-clip pb-28 pt-16 md:pb-40 md:pt-24">
        <div className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-volt/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-coral/20 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-6 text-center md:px-12">
          <p className="rise-in mb-5 font-mono text-xs uppercase tracking-[0.35em] text-volt">
            {t(locale, "land_kicker")}
          </p>
          <h1 className="rise-in font-display text-6xl leading-[0.95] text-bone sm:text-7xl md:text-8xl" style={{ animationDelay: "80ms" }}>
            {t(locale, "land_h1_a").toUpperCase()}
            <br />
            <span className="text-volt">{t(locale, "land_h1_b").toUpperCase()}</span>
          </h1>
          <p
            className="rise-in mx-auto mt-6 max-w-xl text-balance text-lg text-bone/70"
            style={{ animationDelay: "160ms" }}
          >
            {t(locale, "land_sub")}
          </p>
          <div className="rise-in mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ animationDelay: "240ms" }}>
            <Link
              href="/register"
              className="w-full rounded-full bg-volt px-8 py-4 text-center font-bold text-coal-950 transition hover:bg-volt-400 sm:w-auto"
            >
              {t(locale, "land_cta")}
            </Link>
            <Link
              href="/login"
              className="w-full rounded-full border border-bone/20 px-8 py-4 text-center font-semibold text-bone/80 transition hover:border-bone/50 hover:text-bone sm:w-auto"
            >
              {t(locale, "land_have_account")}
            </Link>
          </div>
        </div>
      </section>

      {/* Marquee of workout types */}
      <div className="overflow-hidden border-y border-coal-600 bg-coal-800 py-4">
        <div className="marquee-track flex w-max gap-10 whitespace-nowrap font-mono text-sm uppercase tracking-widest text-bone/50">
          {[...WORKOUT_TYPE_ORDER, ...WORKOUT_TYPE_ORDER].map((key, i) => (
            <span key={i} className="flex items-center gap-2">
              <span className="text-volt">{WORKOUT_TYPES[key].icon}</span>
              {typeLabel(key, locale)}
            </span>
          ))}
        </div>
      </div>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-24 md:px-12">
        <h2 className="font-display text-4xl text-bone md:text-5xl">{t(locale, "land_how").toUpperCase()}</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              n: "01",
              title: t(locale, "land_s1_title"),
              body: t(locale, "land_s1_body"),
            },
            {
              n: "02",
              title: t(locale, "land_s2_title"),
              body: t(locale, "land_s2_body"),
            },
            {
              n: "03",
              title: t(locale, "land_s3_title"),
              body: t(locale, "land_s3_body"),
            },
          ].map((step) => (
            <div key={step.n} className="rounded-2xl border border-coal-600 bg-coal-800 p-8">
              <div className="font-mono text-sm text-coral">{step.n}</div>
              <h3 className="mt-3 font-display text-2xl text-bone">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-bone/60">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Leaderboard preview */}
      <section className="mx-auto max-w-4xl px-6 pb-28 md:px-12">
        <div className="rounded-2xl border border-coal-600 bg-coal-800 p-6 md:p-10">
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="font-display text-3xl text-bone md:text-4xl">{t(locale, "land_squad").toUpperCase()}</h2>
            <span className="font-mono text-xs uppercase tracking-widest text-bone/40">{t(locale, "land_preview")}</span>
          </div>
          <div className="divide-y divide-coal-600">
            {SAMPLE_BOARD.map((row) => (
              <div key={row.rank} className="flex items-center gap-4 py-4">
                <span className="w-8 font-mono text-lg text-bone/40">{row.rank}</span>
                <span className="flex-1 font-semibold text-bone">{row.name}</span>
                <span className={`font-display text-3xl ${gradeStyles[row.grade]}`}>{row.grade}</span>
                <span className="w-14 text-end font-mono text-lg text-bone/60 num-tabular">{row.score}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-coal-600 px-6 py-10 text-center font-mono text-xs uppercase tracking-widest text-bone/30 md:px-12">
        {t(locale, "land_footer")}
      </footer>
    </main>
  );
}
