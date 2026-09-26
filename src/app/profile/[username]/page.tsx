import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAudience } from "@/lib/audience";
import { viewFor, recordEvent } from "@/lib/research";
import { scoreWindow, trailingWindow, gradeColor } from "@/lib/scoring";
import { evaluateWeekTitle } from "@/lib/weeklyTitles";
import { computeRecords } from "@/lib/records";
import { t } from "@/lib/i18n";
import AppNav from "@/components/AppNav";
import WeekTitleBadge from "@/components/WeekTitleBadge";
import RecordsCard from "@/components/RecordsCard";
import WorkoutLog from "@/components/WorkoutLog";

const PAGE_SIZE = 50;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * A person's page, reached by tapping them on a leaderboard: who they are, how their
 * current window is going, their records, and their full workout log.
 *
 * Anyone signed in can open it — the "everyone" board already ranks every account, and
 * this is the detail behind that row. Notes are the exception: the feed only shows them
 * to friends, so a stranger sees the workouts but not what was written about them.
 */
export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: { username: string };
  searchParams?: { page?: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const viewer = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { displayName: true, username: true, condition: true },
  });
  if (!viewer) redirect("/login");

  // Same gate as /leaderboard: this page only exists as the far end of a leaderboard row.
  const view = viewFor(viewer.condition);
  if (!view.showLeaderboard) redirect("/dashboard");

  let username: string;
  try {
    username = decodeURIComponent(params.username).trim().toLowerCase().replace(/^@/, "");
  } catch {
    notFound();
  }

  // Public fields only — never email, password hash, or study condition.
  const owner = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, displayName: true, gender: true },
  });
  if (!owner) notFound();

  const audience = await getAudience();
  const locale = audience.locale;
  const isSelf = owner.id === session.userId;

  const friendship = isSelf
    ? null
    : await prisma.friendship.findFirst({
        where: {
          status: "ACCEPTED",
          OR: [
            { requesterId: session.userId, addresseeId: owner.id },
            { requesterId: owner.id, addresseeId: session.userId },
          ],
        },
        select: { id: true },
      });
  const showNotes = isSelf || friendship !== null;

  await recordEvent(session.userId, "PROFILE_VIEW", {
    condition: viewer.condition,
    self: isSelf,
    friend: friendship !== null,
  });

  const { start, end } = trailingWindow(new Date());
  const [windowWorkouts, history, totalWorkouts] = await Promise.all([
    prisma.workout.findMany({ where: { userId: owner.id, date: { gte: start, lt: end } } }),
    prisma.workout.findMany({
      where: { userId: owner.id },
      select: { id: true, type: true, duration: true, distanceKm: true, date: true },
    }),
    prisma.workout.count({ where: { userId: owner.id } }),
  ]);
  const result = scoreWindow(windowWorkouts);
  const records = computeRecords(history);

  // Titles describe the owner, so they're gendered for the owner, as on the leaderboard.
  const ownerGender = owner.gender === "F" || owner.gender === "M" ? owner.gender : null;
  const weekTitle = view.showTitles ? evaluateWeekTitle(result, { locale, gender: ownerGender }) : null;

  const totalPages = Math.max(1, Math.ceil(totalWorkouts / PAGE_SIZE));
  const requestedPage = Number(searchParams?.page ?? "1");
  const page = Number.isFinite(requestedPage)
    ? Math.min(Math.max(1, Math.floor(requestedPage)), totalPages)
    : 1;
  const workouts = await prisma.workout.findMany({
    where: { userId: owner.id },
    orderBy: { date: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: { id: true, type: true, duration: true, distanceKm: true, note: true, date: true },
  });

  const stats = [
    { label: t(locale, "stat_workouts"), value: result.workoutCount },
    { label: t(locale, "profile_minutes"), value: result.totalMinutes },
    { label: t(locale, "profile_active_days"), value: result.activeDays },
    { label: t(locale, "profile_total"), value: totalWorkouts },
  ];

  return (
    <div className="min-h-screen bg-canvas">
      <AppNav
        displayName={viewer.displayName}
        username={viewer.username}
        locale={locale}
        showLeaderboard={view.showLeaderboard}
        showRanks={view.showTitles}
      />
      <main className="mx-auto max-w-5xl px-6 py-10 md:px-8">
        <Link
          href="/leaderboard"
          className="text-sm text-slate underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          {t(locale, "profile_back")}
        </Link>

        <div className="mt-5 flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-rule text-base font-semibold text-slate">
            {initials(owner.displayName)}
          </span>
          <div className="min-w-0">
            <h1 className="break-words font-display text-4xl leading-none text-ink md:text-5xl">
              {owner.displayName}
              {isSelf && (
                <span className="ms-2 align-middle font-sans text-base font-normal text-slate-light">
                  {t(locale, "you_marker")}
                </span>
              )}
            </h1>
            <p className="mt-1.5 truncate text-sm text-slate">@{owner.username}</p>
          </div>
        </div>

        <section className="sheet mt-8 p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="caption">{t(locale, "profile_last_7")}</p>
              {weekTitle && (
                <div className="mt-3">
                  <WeekTitleBadge weekTitle={weekTitle} compact />
                </div>
              )}
            </div>
            {view.showScore && (
              <div className="flex items-baseline gap-2">
                <span className={`font-display text-5xl leading-none ${gradeColor(result.grade)}`}>
                  {result.grade}
                </span>
                <span className="text-sm text-slate num-tabular">{result.score}/100</span>
              </div>
            )}
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-rule pt-5 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="caption">{s.label}</dt>
                <dd className="mt-2 font-display text-3xl leading-none text-ink num-tabular">{s.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {totalWorkouts > 0 && (
          <div className="mt-5">
            <RecordsCard records={records} locale={locale} />
          </div>
        )}

        <section className="mt-8">
          <h2 className="font-display text-2xl leading-none text-ink">
            {t(locale, "profile_log_heading")}
          </h2>
          {!showNotes && totalWorkouts > 0 && (
            <p className="mt-2 text-[13px] text-slate-light">{t(locale, "profile_notes_friends_only")}</p>
          )}
          {totalWorkouts === 0 ? (
            <div className="sheet mt-4 p-10 text-center">
              <p className="text-sm text-slate">{t(locale, "profile_empty")}</p>
            </div>
          ) : (
            <WorkoutLog
              workouts={workouts}
              locale={locale}
              showNotes={showNotes}
              page={page}
              totalPages={totalPages}
              basePath={`/profile/${encodeURIComponent(owner.username)}`}
            />
          )}
        </section>
      </main>
    </div>
  );
}
