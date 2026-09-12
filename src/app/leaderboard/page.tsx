import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAudience } from "@/lib/audience";
import { viewFor, recordEvent } from "@/lib/research";
import AppNav from "@/components/AppNav";
import LeaderboardClient from "@/components/LeaderboardClient";

export default async function LeaderboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { displayName: true, condition: true },
  });
  if (!user) redirect("/login");

  const view = viewFor(user.condition);
  if (!view.showLeaderboard) redirect("/dashboard");

  const audience = await getAudience();

  await recordEvent(session.userId, "LEADERBOARD_VIEW", { condition: user.condition });

  return (
    <>
      <AppNav
        displayName={user.displayName}
        locale={audience.locale}
        showLeaderboard={view.showLeaderboard}
        showRanks={view.showTitles}
      />
      <main className="mx-auto max-w-3xl px-6 py-10 md:px-8">
        <LeaderboardClient locale={audience.locale} />
      </main>
    </>
  );
}
