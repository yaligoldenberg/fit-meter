import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAudience } from "@/lib/audience";
import { viewFor } from "@/lib/research";
import { t } from "@/lib/i18n";
import AppNav from "@/components/AppNav";
import ProfileForm from "@/components/ProfileForm";
import PushToggle from "@/components/PushToggle";
import { vapidPublicKey } from "@/lib/push";

/** Your own account: rename yourself. Other people's pages live at /profile/[username]. */
export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { displayName: true, username: true, condition: true },
  });
  if (!user) redirect("/login");

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
      <main className="mx-auto max-w-2xl px-6 py-10 md:px-8">
        <h1 className="font-display text-5xl leading-none text-ink md:text-6xl">
          {t(audience.locale, "profile_title")}
        </h1>
        <p className="mt-3 text-[15px] text-slate">{t(audience.locale, "profile_sub")}</p>
        <section className="sheet mt-8 p-6 md:p-9">
          <ProfileForm
            locale={audience.locale}
            displayName={user.displayName}
            username={user.username}
          />
        </section>
        {view.showLeaderboard && (
          <section className="sheet mt-5 p-6 md:p-9">
            <PushToggle locale={audience.locale} vapidPublicKey={vapidPublicKey()} />
          </section>
        )}
      </main>
    </>
  );
}
