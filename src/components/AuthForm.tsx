"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Locale, t } from "@/lib/i18n";
import LanguageToggle from "./LanguageToggle";
import Wordmark from "./Wordmark";
import ThemeToggle from "./ThemeToggle";

type Mode = "login" | "register";

export default function AuthForm({
  mode,
  locale,
  next = null,
}: {
  mode: Mode;
  locale: Locale;
  /** Where to land after signing in, already vetted as a same-site path by the page. */
  next?: string | null;
}) {
  // Carried across the login/register switch so the destination survives it.
  const nextQuery = next ? `?next=${encodeURIComponent(next)}` : "";
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    username: "",
    displayName: "",
    identifier: "",
    password: "",
  });
  // Required on register: drives the title ladder and Hebrew grammatical agreement.
  const [gender, setGender] = useState<"F" | "M" | null>(null);

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "register" && !gender) {
      setError(t(locale, "auth_gender_required"));
      return;
    }
    setLoading(true);
    try {
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login"
          ? { identifier: form.identifier, password: form.password }
          : {
              email: form.email,
              username: form.username,
              displayName: form.displayName,
              password: form.password,
              gender,
              locale,
            };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t(locale, "generic_error"));
        setLoading(false);
        return;
      }
      router.push(next ?? "/dashboard");
      router.refresh();
    } catch {
      setError(t(locale, "network_error"));
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link href="/" aria-label="FitMeter">
          <Wordmark size="text-2xl" />
        </Link>
        <ThemeToggle locale={locale} />
      </div>
      <div className="sheet p-7 md:p-8">
        <LanguageToggle locale={locale} variant="full" />
        <h1 className="mt-7 font-display text-5xl leading-none text-ink">
          {t(locale, mode === "login" ? "auth_welcome_back" : "auth_join")}
        </h1>
        <p className="mt-2.5 text-sm leading-relaxed text-slate">
          {t(locale, mode === "login" ? "auth_login_sub" : "auth_register_sub")}
        </p>

      <form onSubmit={onSubmit} className="mt-7 flex flex-col gap-4">
        {mode === "register" && (
          <>
            <Field label={t(locale, "field_display_name")}>
              <input
                required
                maxLength={40}
                value={form.displayName}
                onChange={update("displayName")}
                placeholder="Dana Keller"
                className="input"
              />
            </Field>
            <Field label={t(locale, "field_username")}>
              <input
                required
                minLength={3}
                maxLength={20}
                pattern="[a-zA-Z0-9_]+"
                value={form.username}
                onChange={update("username")}
                placeholder="danak"
                className="input"
              />
            </Field>
            <Field label={t(locale, "field_email")}>
              <input
                required
                type="email"
                value={form.email}
                onChange={update("email")}
                placeholder="you@example.com"
                className="input"
              />
            </Field>
            <FieldGroup label={t(locale, "field_gender")}>
              <div className="flex gap-2">
                {([
                  ["F", t(locale, "gender_f")],
                  ["M", t(locale, "gender_m")],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setGender(value)}
                    aria-pressed={gender === value}
                    className={`chip flex-1 justify-center py-2.5 ${
                      gender === value ? "chip-on" : ""
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-slate-light">{t(locale, "gender_hint")}</p>
            </FieldGroup>
          </>
        )}
        {mode === "login" && (
          <Field label={t(locale, "auth_identifier")}>
            <input
              required
              value={form.identifier}
              onChange={update("identifier")}
              placeholder="danak or you@example.com"
              className="input"
            />
          </Field>
        )}
        <Field label={t(locale, "field_password")}>
          <input
            required
            minLength={6}
            type="password"
            value={form.password}
            onChange={update("password")}
            placeholder="••••••••"
            className="input"
          />
        </Field>

        {error && (
          <p className="border-s-[3px] border-flag-red bg-chalk px-3 py-2 text-sm text-flag-red">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary mt-2 py-3 text-base">
          {loading ? t(locale, "auth_wait") : t(locale, mode === "login" ? "login" : "auth_submit_register")}
        </button>
      </form>
      </div>

      <p className="mt-6 text-center text-sm text-slate">
        {mode === "login" ? (
          <>
            {t(locale, "auth_new_here")}{" "}
            <Link href={`/register${nextQuery}`} className="font-semibold text-signal underline-offset-4 hover:underline">
              {t(locale, "auth_submit_register")}
            </Link>
          </>
        ) : (
          <>
            {t(locale, "auth_have_one")}{" "}
            <Link href={`/login${nextQuery}`} className="font-semibold text-signal underline-offset-4 hover:underline">
              {t(locale, "login")}
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="caption">{label}</span>
      {children}
    </label>
  );
}

/**
 * Field's look for a set of buttons. A <label> forwards clicks on its caption to the first
 * control inside it, which silently picked the first chip; a labelled group doesn't.
 */
function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-1.5">
      <span id={id} className="caption">
        {label}
      </span>
      {children}
    </div>
  );
}
