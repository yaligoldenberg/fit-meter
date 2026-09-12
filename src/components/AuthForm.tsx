"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Locale, t } from "@/lib/i18n";
import LanguageToggle from "./LanguageToggle";

type Mode = "login" | "register";

export default function AuthForm({ mode, locale }: { mode: Mode; locale: Locale }) {
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
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t(locale, "network_error"));
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-8 font-display text-2xl tracking-wide text-bone">
        FIT<span className="text-volt">METER</span>
      </Link>
      <div className="mb-8">
        <LanguageToggle locale={locale} variant="full" />
      </div>
      <h1 className="font-display text-4xl text-bone">
        {t(locale, mode === "login" ? "auth_welcome_back" : "auth_join").toUpperCase()}
      </h1>
      <p className="mt-2 text-sm text-bone/60">
        {t(locale, mode === "login" ? "auth_login_sub" : "auth_register_sub")}
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
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
            <Field label={t(locale, "field_gender")}>
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
                    className={`flex-1 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                      gender === value
                        ? "border-volt bg-volt text-coal-950"
                        : "border-coal-600 bg-coal-900 text-bone/70 hover:border-bone/40"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-bone/40">{t(locale, "gender_hint")}</p>
            </Field>
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

        {error && <p className="rounded-lg bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-full bg-volt px-6 py-3 font-bold text-coal-950 transition hover:bg-volt-400 disabled:opacity-50"
        >
          {loading ? t(locale, "auth_wait") : t(locale, mode === "login" ? "login" : "auth_submit_register")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-bone/50">
        {mode === "login" ? (
          <>
            {t(locale, "auth_new_here")}{" "}
            <Link href="/register" className="font-semibold text-volt">
              {t(locale, "auth_submit_register")}
            </Link>
          </>
        ) : (
          <>
            {t(locale, "auth_have_one")}{" "}
            <Link href="/login" className="font-semibold text-volt">
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
      <span className="font-mono text-xs uppercase tracking-widest text-bone/50">{label}</span>
      {children}
    </label>
  );
}
