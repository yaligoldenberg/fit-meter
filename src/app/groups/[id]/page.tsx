import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAudience } from "@/lib/audience";
import { viewFor } from "@/lib/research";
import { membershipOf } from "@/lib/groups";
import AppNav from "@/components/AppNav";
import GroupDetailPanel from "@/components/GroupDetailPanel";
import LeaderboardClient from "@/components/LeaderboardClient";

export default async function GroupPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { displayName: true, username: true, condition: true },
  });
  if (!user) redirect("/login");

  // 404 covers both "no such group" and "not a member" — a stranger poking at ids
  // should not be able to tell the two apart.
  const membership = await membershipOf(params.id, session.userId);
  if (!membership) notFound();

  const rows = await prisma.groupMember.findMany({
    where: { groupId: params.id },
    orderBy: { joinedAt: "asc" },
    select: { user: { select: { id: true, displayName: true, username: true } } },
  });

  const members = rows.map((r) => ({
    id: r.user.id,
    displayName: r.user.displayName,
    username: r.user.username,
    isMe: r.user.id === session.userId,
    isOwner: r.user.id === membership.group.ownerId,
  }));

  const audience = await getAudience();
  const view = viewFor(user.condition);

  return (
    <>
      <AppNav
        displayName={user.displayName}
        username={user.username}
        locale={audience.locale}
        showLeaderboard={view.showLeaderboard}
        showRanks={view.showTitles}
      />
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10 md:px-8">
        <GroupDetailPanel
          locale={audience.locale}
          groupId={membership.group.id}
          name={membership.group.name}
          joinCode={membership.group.joinCode}
          isOwner={membership.isOwner}
          members={members}
        />
        {view.showLeaderboard && (
          <LeaderboardClient locale={audience.locale} groupId={membership.group.id} />
        )}
      </main>
    </>
  );
}
