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
        <Link href="/" className="mb-10 font-display text-2xl tracking-wide text-bone">
          FIT<span className="text-volt">METER</span>
        </Link>
        <p className="rounded-lg bg-coral/10 px-3 py-2 text-sm text-coral">{apiError("reset_invalid", locale)}</p>
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
      <Link href="/" className="mb-10 font-display text-2xl tracking-wide text-bone">
        FIT<span className="text-volt">METER</span>
      </Link>
      <h1 className="font-display text-4xl text-bone">{t(locale, "reset_heading").toUpperCase()}</h1>
      <p className="mt-2 text-sm text-bone/60">{t(locale, "reset_sub")}</p>

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

        {error && <p className="rounded-lg bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-full bg-volt px-6 py-3 font-bold text-coal-950 transition hover:bg-volt-400 disabled:opacity-50"
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
      <span className="font-mono text-xs uppercase tracking-widest text-bone/50">{label}</span>
      {children}
    </label>
  );
}
