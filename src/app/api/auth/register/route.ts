import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, createSessionToken, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/auth";
import { recordEvent } from "@/lib/research";
import { apiError, ApiErrorKey } from "@/lib/apiErrors";
import { usernameSchema, displayNameSchema, uniqueViolationTarget } from "@/lib/accountRules";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "@/lib/i18n";

const schema = z.object({
  email: z.string().email(),
  username: usernameSchema,
  displayName: displayNameSchema,
  password: z.string().min(6).max(72),
  gender: z.enum(["F", "M"]),
  locale: z.enum(["he", "en"]).optional(),
});

/** The localized error for the first field that failed validation. */
function validationError(issue: z.ZodIssue | undefined): { key: ApiErrorKey; field?: string } {
  const field = issue?.path[0];
  switch (field) {
    case "email":
      return { key: "email_invalid", field };
    case "username":
      return { key: "username_invalid", field };
    case "displayName":
      return { key: "display_name_invalid", field };
    case "password":
      // bcrypt ignores everything past 72 bytes, hence the upper bound.
      return { key: issue?.code === "too_big" ? "password_too_long" : "password_too_short", field };
    case "gender":
      return { key: "gender_required", field };
    default:
      return { key: "invalid_input" };
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  // The locale cookie is the visitor's latest explicit choice (see src/lib/audience.ts),
  // so it wins over the form's copy; the account and the cookie start out agreeing.
  const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : isLocale(body?.locale) ? body.locale : DEFAULT_LOCALE;

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const { key, field } = validationError(parsed.error.issues[0]);
    return NextResponse.json({ error: apiError(key, locale), field }, { status: 400 });
  }
  const { email, username, displayName, password, gender } = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] },
  });
  if (existing) {
    const field = existing.email === email.toLowerCase() ? "email" : "username";
    return NextResponse.json(
      { error: apiError(field === "email" ? "email_taken" : "username_taken", locale), field },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        displayName,
        passwordHash,
        gender,
        locale,
      },
    });
  } catch (e) {
    // Two simultaneous signups can both clear the check above; the unique constraint is
    // the real arbiter, so translate its violation instead of returning a 500.
    const target = uniqueViolationTarget(e);
    if (!target) throw e;
    const field = target.includes("email") ? "email" : "username";
    return NextResponse.json(
      { error: apiError(field === "email" ? "email_taken" : "username_taken", locale), field },
      { status: 409 }
    );
  }

  await recordEvent(user.id, "DASHBOARD_VIEW", { source: "registration" });

  const token = await createSessionToken({ userId: user.id, username: user.username, sv: user.sessionVersion });
  const res = NextResponse.json({ id: user.id, username: user.username, displayName: user.displayName });
  res.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
  if (!isLocale(cookieLocale)) {
    res.cookies.set(LOCALE_COOKIE, locale, { sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  return res;
}
