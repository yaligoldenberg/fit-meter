import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { LOCALE_COOKIE } from "@/lib/i18n";

const schema = z.object({
  locale: z.enum(["he", "en"]).optional(),
  gender: z.enum(["F", "M"]).optional(),
});

/**
 * Language and gender preferences. Locale is mirrored into a cookie so the root layout
 * can set lang/dir without a database round trip, including for logged-out pages.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid preferences" }, { status: 400 });
  }
  const { locale, gender } = parsed.data;
  if (!locale && !gender) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const session = await getSession();
  if (session) {
    await prisma.user.update({
      where: { id: session.userId },
      data: { ...(locale ? { locale } : {}), ...(gender ? { gender } : {}) },
    });
  } else if (gender) {
    // Gender only means anything for a signed-in user.
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, locale, gender });
  if (locale) {
    res.cookies.set(LOCALE_COOKIE, locale, {
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}
