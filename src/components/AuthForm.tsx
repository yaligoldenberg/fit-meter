"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Mode = "login" | "register";

export default function AuthForm({ mode }: { mode: Mode }) {
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

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login"
          ? { identifier: form.identifier, password: form.password }
          : { email: form.email, username: form.username, displayName: form.displayName, password: form.password };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error — try again");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-10 font-display text-2xl tracking-wide text-bone">
        FIT<span className="text-volt">METER</span>
      </Link>
      <h1 className="font-display text-4xl text-bone">{mode === "login" ? "WELCOME BACK" : "JOIN THE BOARD"}</h1>
      <p className="mt-2 text-sm text-bone/60">
        {mode === "login" ? "Log in to see this week's score." : "Create an account and start logging workouts."}
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        {mode === "register" && (
          <>
            <Field label="Display name">
              <input
                required
                maxLength={40}
                value={form.displayName}
                onChange={update("displayName")}
                placeholder="Dana Keller"
                className="input"
              />
            </Field>
            <Field label="Username">
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
            <Field label="Email">
              <input
                required
                type="email"
                value={form.email}
                onChange={update("email")}
                placeholder="you@example.com"
                className="input"
              />
            </Field>
          </>
        )}
        {mode === "login" && (
          <Field label="Username or email">
            <input
              required
              value={form.identifier}
              onChange={update("identifier")}
              placeholder="danak or you@example.com"
              className="input"
            />
          </Field>
        )}
        <Field label="Password">
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
          {loading ? "One sec…" : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-bone/50">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link href="/register" className="font-semibold text-volt">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have one?{" "}
            <Link href="/login" className="font-semibold text-volt">
              Log in
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
