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
 * The signed-in user's stored preference wins; the cookie covers logged-out pages and
 * keeps the server-rendered `dir` in sync with what the user last picked.
 */
export async function getAudience(): Promise<Audience> {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const fallback: Audience = {
    locale: isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE,
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
    locale: isLocale(user.locale) ? user.locale : fallback.locale,
    gender: user.gender === "F" || user.gender === "M" ? user.gender : null,
  };
}
