import { cookies } from "next/headers";
import { getSession } from "./auth";
import { prisma } from "./db";
import { Locale, Gender, DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "./i18n";

export interface Audience {
  locale: Locale;
  gender: Gender | null;
}

/**
 * Who is looking at the page — language and grammatical gender.
 *
 * The cookie wins when it is set, because it is the visitor's most recent explicit
 * choice and it is also what the root layout renders `lang`/`dir` from. Letting the
 * stored preference win instead split those two apart: picking English flipped the
 * document to LTR while every string kept rendering in Hebrew, any time the write to
 * the user record failed or lagged. The stored value still covers a fresh device,
 * where there is no cookie yet.
 */
export async function getAudience(): Promise<Audience> {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const chosen = isLocale(cookieLocale) ? cookieLocale : null;
  const fallback: Audience = {
    locale: chosen ?? DEFAULT_LOCALE,
    gender: null,
  };

  const session = await getSession();
  if (!session) return fallback;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { locale: true, gender: true },
  });
  if (!user) return fallback;

  return {
    locale: chosen ?? (isLocale(user.locale) ? user.locale : DEFAULT_LOCALE),
    gender: user.gender === "F" || user.gender === "M" ? user.gender : null,
  };
}
