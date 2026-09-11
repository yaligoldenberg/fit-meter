import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AppNav from "@/components/AppNav";
import FriendsPanel from "@/components/FriendsPanel";

export default async function FriendsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { displayName: true },
  });
  if (!user) redirect("/login");

  return (
    <>
      <AppNav displayName={user.displayName} />
      <main className="mx-auto max-w-2xl px-6 py-10 md:px-8">
        <FriendsPanel />
      </main>
    </>
  );
}
