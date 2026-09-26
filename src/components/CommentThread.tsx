"use client";

import { useState } from "react";
import { Locale, t } from "@/lib/i18n";

interface CommentItem {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; displayName: string; username: string };
  mine: boolean;
}

/**
 * Comments on one workout, loaded on demand — a feed of 30 workouts shouldn't fetch
 * thirty threads nobody opened.
 */
export default function CommentThread({
  workoutId,
  locale,
  initialCount = 0,
}: {
  workoutId: string;
  locale: Locale;
  initialCount?: number;
}) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<CommentItem[] | null>(null);
  const [count, setCount] = useState(initialCount);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && comments === null) await load();
  }

  async function load() {
    setError(null);
    try {
      const res = await fetch(`/api/comments?workoutId=${encodeURIComponent(workoutId)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setComments(data.comments ?? []);
      setCount((data.comments ?? []).length);
    } catch {
      setError(t(locale, "network_error"));
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workoutId, body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t(locale, "comment_error"));
        return;
      }
      setComments((prev) => [...(prev ?? []), data.comment]);
      setCount((n) => n + 1);
      setDraft("");
    } catch {
      setError(t(locale, "network_error"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const previous = comments;
    setComments((prev) => (prev ?? []).filter((c) => c.id !== id));
    setCount((n) => Math.max(0, n - 1));
    try {
      const res = await fetch(`/api/comments?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setComments(previous ?? null);
      setCount((n) => n + 1);
      setError(t(locale, "network_error"));
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={toggle}
        className="text-[11px] text-slate-light transition hover:text-ink"
      >
        {t(locale, "comments_heading")}
        {count > 0 ? ` · ${count}` : ""}
      </button>

      {open && (
        <div className="mt-2 rounded-sheet border border-rule bg-chalk px-4 py-3">
          {comments === null && !error && <p className="text-xs text-slate-light">{t(locale, "loading_ellipsis")}</p>}
          {comments !== null && comments.length === 0 && (
            <p className="text-xs text-slate-light">{t(locale, "comment_empty")}</p>
          )}

          <ul className="flex flex-col gap-2">
            {(comments ?? []).map((c) => (
              <li key={c.id} className="flex items-start gap-2">
                <span className="text-xs font-semibold text-ink">{c.user.displayName}</span>
                <span className="min-w-0 flex-1 break-words text-xs text-slate">{c.body}</span>
                {c.mine && (
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    aria-label={t(locale, "comment_delete")}
                    className="shrink-0 text-slate-light transition hover:text-flag-red"
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>

          <form onSubmit={send} className="mt-3 flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={280}
              placeholder={t(locale, "comment_placeholder")}
              // 16px: anything smaller makes iOS Safari zoom the page on focus.
              className="input flex-1 py-1.5 text-base"
            />
            <button
              type="submit"
              disabled={busy || draft.trim().length === 0}
              className="btn-primary shrink-0 px-4 py-1.5 text-xs"
            >
              {busy ? t(locale, "comment_sending") : t(locale, "comment_send")}
            </button>
          </form>

          {error && <p className="mt-2 text-xs text-flag-red">{error}</p>}
        </div>
      )}
    </div>
  );
}
