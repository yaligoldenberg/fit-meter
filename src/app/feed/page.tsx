import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAudience } from "@/lib/audience";
import { viewFor, recordEvent } from "@/lib/research";
import AppNav from "@/components/AppNav";
import FeedClient from "@/components/FeedClient";

export default async function FeedPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { displayName: true, condition: true },
  });
  if (!user) redirect("/login");

  const view = viewFor(user.condition);
  // The feed is a social surface, same as the leaderboard — arms that can't see
  // the leaderboard must not reach this page either, even by typing the URL.
  if (!view.showLeaderboard) redirect("/dashboard");

  const audience = await getAudience();

  await recordEvent(session.userId, "FEED_VIEW", { condition: user.condition });

  return (
    <>
      <AppNav
        displayName={user.displayName}
        locale={audience.locale}
        showLeaderboard={view.showLeaderboard}
        showRanks={view.showTitles}
      />
      <main className="mx-auto max-w-2xl px-6 py-10 md:px-8">
        <FeedClient locale={audience.locale} meId={session.userId} />
      </main>
    </>
  );
}
