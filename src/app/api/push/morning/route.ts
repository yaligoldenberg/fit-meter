import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { sendMorningWinner } from "@/lib/push";

/**
 * Called by the Supabase pg_cron job at 04:00 and 05:00 UTC — one of which is 07:00 in
 * Israel whichever side of daylight saving it is. The other call is refused by the hour
 * check in sendMorningWinner, and a repeat is refused by the per-day row, so the job can
 * be retried freely.
 *
 * Query flags: `dryRun=1` returns the message without sending; `force=1` sends outside
 * 07:00 (still once per day). Both need the same secret as the cron.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.PUSH_CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !safeEqual(given, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const result = await sendMorningWinner(new Date(), {
    dryRun: params.get("dryRun") === "1",
    force: params.get("force") === "1",
  });
  return NextResponse.json(result, { status: result.status === "not_configured" ? 503 : 200 });
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
