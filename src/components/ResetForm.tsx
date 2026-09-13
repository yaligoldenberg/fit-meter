"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Locale, t } from "@/lib/i18n";
import { apiError } from "@/lib/apiErrors";

export default function ResetForm({ token, locale }: { token: string; locale: Locale }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  if (!token) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <Link href="/" className="mb-10 font-display text-2xl tracking-wide text-ink">
          FIT<span className="text-signal">METER</span>
        </Link>
        <p className="border-s-[3px] border-flag-red bg-chalk px-3 py-2 text-sm text-flag-red">{apiError("reset_invalid", locale)}</p>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(t(locale, "reset_mismatch"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
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
      <Link href="/" className="mb-10 font-display text-2xl tracking-wide text-ink">
        FIT<span className="text-signal">METER</span>
      </Link>
      <h1 className="font-display text-4xl text-ink">{t(locale, "reset_heading")}</h1>
      <p className="mt-2 text-sm text-slate">{t(locale, "reset_sub")}</p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <Field label={t(locale, "field_new_password")}>
          <input
            required
            minLength={6}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="input"
          />
        </Field>
        <Field label={t(locale, "field_confirm_password")}>
          <input
            required
            minLength={6}
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            className="input"
          />
        </Field>

        {error && <p className="border-s-[3px] border-flag-red bg-chalk px-3 py-2 text-sm text-flag-red">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 btn-primary py-3 text-base"
        >
          {loading ? t(locale, "auth_wait") : t(locale, "reset_submit")}
        </button>
      </form>
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
