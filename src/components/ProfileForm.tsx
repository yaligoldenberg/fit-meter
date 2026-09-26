"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Locale, t } from "@/lib/i18n";

type Field = "displayName" | "username";

export default function ProfileForm({
  locale,
  displayName: initialDisplayName,
  username: initialUsername,
}: {
  locale: Locale;
  displayName: string;
  username: string;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [username, setUsername] = useState(initialUsername);
  // The saved handle, which the public-page link must point at — not whatever is
  // half-typed in the box.
  const [savedUsername, setSavedUsername] = useState(initialUsername);
  const [error, setError] = useState<{ message: string; field: Field | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, username }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError({ message: data.error ?? t(locale, "generic_error"), field: data.field ?? null });
        return;
      }
      setDisplayName(data.user.displayName);
      setUsername(data.user.username);
      setSavedUsername(data.user.username);
      setSaved(true);
      // The nav shows the name and handle; re-render the server parts so it catches up.
      router.refresh();
    } catch {
      setError({ message: t(locale, "network_error"), field: null });
    } finally {
      setLoading(false);
    }
  }

  const fieldError = (field: Field) =>
    error?.field === field ? (
      <p id={`${field}-error`} className="mt-1.5 text-sm text-flag-red">
        {error.message}
      </p>
    ) : null;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="caption">{t(locale, "field_display_name")}</span>
        <input
          required
          maxLength={40}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          aria-invalid={error?.field === "displayName"}
          aria-describedby={error?.field === "displayName" ? "displayName-error" : undefined}
          className="input"
        />
        {fieldError("displayName")}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="caption">{t(locale, "field_username")}</span>
        <div className="flex items-center gap-2" dir="ltr">
          <span className="text-slate">@</span>
          <input
            required
            minLength={3}
            maxLength={20}
            pattern="[a-zA-Z0-9_]+"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            aria-invalid={error?.field === "username"}
            aria-describedby={error?.field === "username" ? "username-error" : "username-hint"}
            className="input"
          />
        </div>
        {fieldError("username") ?? (
          <p id="username-hint" className="mt-1.5 text-xs text-slate-light">
            {t(locale, "profile_username_hint")}
          </p>
        )}
      </label>

      {error && !error.field && (
        <p className="border-s-[3px] border-flag-red bg-chalk px-3 py-2 text-sm text-flag-red">
          {error.message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={loading} className="btn-primary py-3 text-base">
          {loading ? t(locale, "saving") : t(locale, "profile_save")}
        </button>
        <span
          aria-live="polite"
          className={`text-sm font-semibold text-signal transition-opacity duration-300 ${
            saved ? "opacity-100" : "opacity-0"
          }`}
        >
          {t(locale, "profile_saved")}
        </span>
      </div>

      <div className="border-t border-rule pt-4">
        <Link
          href={`/profile/${savedUsername}`}
          className="text-sm font-semibold text-signal underline-offset-4 hover:underline"
        >
          {t(locale, "profile_view_public")} →
        </Link>
      </div>
    </form>
  );
}
