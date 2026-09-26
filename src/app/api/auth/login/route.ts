import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, createSessionToken, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/auth";
import { getAudience } from "@/lib/audience";
import { apiError } from "@/lib/apiErrors";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n";

const schema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

/**
 * Failed-login throttle. The app runs as a single Render instance, so an in-process Map
 * is the whole picture — no shared store needed. Fixed 15-minute windows, counted per
 * account (so rotating IPs doesn't help against one user) and per client IP (so one
 * client can't sweep many accounts). The IP is the first X-Forwarded-For hop, which a
 * client can forge; the per-account cap is the one that actually protects a password.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS_PER_ACCOUNT = 10;
const MAX_FAILS_PER_IP = 30;
const failures = new Map<string, { count: number; resetAt: number }>();
let lastPrune = 0;

function prune(now: number) {
  if (now - lastPrune < 60 * 1000) return;
  lastPrune = now;
  failures.forEach((entry, key) => {
    if (entry.resetAt <= now) failures.delete(key);
  });
}

function failCount(key: string, now: number): number {
  const entry = failures.get(key);
  return entry && entry.resetAt > now ? entry.count : 0;
}

function recordFailure(key: string, now: number) {
  const entry = failures.get(key);
  if (entry && entry.resetAt > now) entry.count += 1;
  else failures.set(key, { count: 1, resetAt: now + WINDOW_MS });
}

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest) {
  const { locale } = await getAudience();

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: apiError("credentials_missing", locale) }, { status: 400 });
  }
  const { identifier, password } = parsed.data;
  const id = identifier.toLowerCase().trim();

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: id }, { username: id }] },
  });

  // Keyed on the resolved account where there is one, so alternating between its email
  // and username doesn't buy twice the attempts.
  const now = Date.now();
  prune(now);
  const accountKey = `account:${user?.id ?? id}`;
  const ipKey = `ip:${clientIp(req)}`;
  if (failCount(accountKey, now) >= MAX_FAILS_PER_ACCOUNT || failCount(ipKey, now) >= MAX_FAILS_PER_IP) {
    return NextResponse.json(
      { error: apiError("too_many_attempts", locale) },
      { status: 429, headers: { "Retry-After": String(WINDOW_MS / 1000) } }
    );
  }

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    recordFailure(accountKey, now);
    recordFailure(ipKey, now);
    return NextResponse.json({ error: apiError("credentials_wrong", locale) }, { status: 401 });
  }
  failures.delete(accountKey);

  const token = await createSessionToken({ userId: user.id, username: user.username, sv: user.sessionVersion });
  const res = NextResponse.json({ id: user.id, username: user.username, displayName: user.displayName });
  res.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);

  // One language everywhere: the cookie is the visitor's latest explicit choice (see
  // src/lib/audience.ts), so it overwrites the stored preference that the morning push
  // reads. With no cookie on this device, the stored preference seeds it instead.
  const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) {
    if (cookieLocale !== user.locale) {
      await prisma.user.update({ where: { id: user.id }, data: { locale: cookieLocale } });
    }
  } else if (isLocale(user.locale)) {
    res.cookies.set(LOCALE_COOKIE, user.locale, { sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  return res;
}
