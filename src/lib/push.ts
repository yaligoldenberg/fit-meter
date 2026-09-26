import webpush from "web-push";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { rankEveryone } from "./leaderboard";
import { STUDY_TIME_ZONE } from "./scoring";
import { viewFor } from "./research";

/**
 * The morning winner notification: at 07:00 Israel time every subscribed browser is told
 * who is #1 on the everyone leaderboard.
 *
 * Web Push itself is free — the browser vendors' push services deliver the message, and
 * VAPID keys (env) prove it came from this server. The 07:00 trigger is a Supabase
 * pg_cron job calling /api/push/morning, because Render's free plan has no cron.
 */

const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "https://fit-meter.onrender.com";

export function vapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

function configured(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(VAPID_SUBJECT, publicKey, privateKey);
  return true;
}

/** Wall-clock date and hour in Israel — the cron runs in UTC and has to be translated. */
export function israelClock(now: Date): { day: string; hour: number } {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: STUDY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: STUDY_TIME_ZONE, hour: "2-digit", hourCycle: "h23" }).format(now)
  );
  return { day, hour };
}

interface Winner {
  id: string;
  displayName: string;
  score: number;
}

interface Recipient {
  id: string;
  locale: string;
  gender: string | null;
}

export interface PushMessage {
  title: string;
  body: string;
  url: string;
  tag: string;
  lang: "he" | "en";
  dir: "rtl" | "ltr";
}

/** The notification text, in the recipient's language, and addressed to them if they're the winner. */
export function winnerMessage(winner: Winner, to: Recipient): PushMessage {
  const self = winner.id === to.id;
  const base = { url: "/leaderboard", tag: "morning-winner" };

  if (to.locale === "en") {
    return {
      ...base,
      lang: "en",
      dir: "ltr",
      title: self ? "🏆 You're #1" : `🏆 ${winner.displayName} is #1`,
      body: `Top of the everyone leaderboard for the last 7 days · score ${winner.score}`,
    };
  }

  // Hebrew addresses the reader in the second person, which is gendered; with no gender
  // on file the self-notice is phrased around "your" instead.
  const selfTitle =
    to.gender === "F" ? "🏆 את במקום הראשון" : to.gender === "M" ? "🏆 אתה במקום הראשון" : "🏆 המקום הראשון שלך";
  return {
    ...base,
    lang: "he",
    dir: "rtl",
    title: self ? selfTitle : `🏆 ${winner.displayName} במקום הראשון`,
    body: `בראש הטבלה הכללית של 7 הימים האחרונים · ציון ${winner.score}`,
  };
}

export type MorningResult =
  | { status: "not_configured" }
  | { status: "not_seven_am"; israelHour: number }
  | { status: "already_sent"; day: string }
  | { status: "no_winner"; day: string }
  | { status: "dry_run"; day: string; winner: Winner; subscriptions: number; sample: PushMessage }
  | { status: "sent"; day: string; winner: Winner; sent: number; failed: number; removed: number };

/**
 * Sends today's winner to every subscription, at most once per Israel day.
 *
 * `force` skips the 07:00 check (manual runs); `dryRun` computes the message without
 * sending or marking the day, for checking a deploy without waking anyone up.
 */
export async function sendMorningWinner(
  now: Date,
  opts: { force?: boolean; dryRun?: boolean } = {}
): Promise<MorningResult> {
  if (!configured()) return { status: "not_configured" };

  const { day, hour } = israelClock(now);
  if (!opts.force && !opts.dryRun && hour !== 7) return { status: "not_seven_am", israelHour: hour };

  const [top] = await rankEveryone(now);
  if (!top || top.score <= 0) return { status: "no_winner", day };
  const winner: Winner = { id: top.id, displayName: top.displayName, score: top.score };

  // Only people whose arm shows the leaderboard get told what's on it.
  const subscriptions = (
    await prisma.pushSubscription.findMany({
      include: { user: { select: { id: true, locale: true, gender: true, condition: true } } },
    })
  ).filter((s) => viewFor(s.user.condition).showLeaderboard);

  if (opts.dryRun) {
    const sample = winnerMessage(winner, { id: "", locale: "he", gender: null });
    return { status: "dry_run", day, winner, subscriptions: subscriptions.length, sample };
  }

  // Claim the day before sending anything. The insert is the lock: a second trigger the
  // same morning hits the primary key and stops here, so nobody is notified twice.
  try {
    await prisma.dailyPush.create({ data: { day, winnerId: winner.id } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { status: "already_sent", day };
    }
    throw e;
  }

  const outcomes = await Promise.allSettled(
    subscriptions.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(winnerMessage(winner, s.user)),
        // A phone that's off until 13:00 should still get it; after that it's stale.
        { TTL: 6 * 60 * 60 }
      )
    )
  );

  // 404/410 mean the browser dropped the subscription (uninstalled, permissions reset).
  const gone: string[] = [];
  outcomes.forEach((o, i) => {
    if (o.status === "rejected") {
      const code = (o.reason as { statusCode?: number })?.statusCode;
      if (code === 404 || code === 410) gone.push(subscriptions[i].id);
    }
  });
  if (gone.length) await prisma.pushSubscription.deleteMany({ where: { id: { in: gone } } });

  const sent = outcomes.filter((o) => o.status === "fulfilled").length;
  await prisma.dailyPush.update({ where: { day }, data: { sent } });

  return { status: "sent", day, winner, sent, failed: outcomes.length - sent, removed: gone.length };
}
