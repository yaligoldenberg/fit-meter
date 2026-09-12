"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Locale, t, tn } from "@/lib/i18n";
import { MAX_GROUP_NAME } from "@/lib/groupLimits";

interface Member {
  id: string;
  displayName: string;
  username: string;
  isMe: boolean;
  isOwner: boolean;
}

/**
 * Name, join code and membership for one group, plus the owner's controls.
 *
 * Destructive actions arm on the first press and fire on the second, rather than going
 * through window.confirm — a native dialog in a webview is easy to dismiss by accident,
 * and the second press reads as a deliberate answer to the question on the button.
 */
export default function GroupDetailPanel({
  locale,
  groupId,
  name,
  joinCode,
  isOwner,
  members,
}: {
  locale: Locale;
  groupId: string;
  name: string;
  joinCode: string;
  isOwner: boolean;
  members: Member[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [armed, setArmed] = useState<"leave" | "delete" | null>(null);

  async function call(url: string, method: string, body?: object): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? t(locale, "generic_error"));
        return false;
      }
      return true;
    } catch {
      setError(t(locale, "generic_error"));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is blocked in some embedded browsers; the code is on screen anyway.
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/groups" className="font-mono text-xs uppercase tracking-widest text-bone/40 hover:text-bone">
        ← {t(locale, "groups_back")}
      </Link>

      <div className="rounded-2xl border border-coal-600 bg-coal-800 p-6 md:p-8">
        {renaming ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const next = draftName.trim();
              if (!next) return;
              if (await call(`/api/groups/${groupId}`, "PATCH", { name: next })) {
                setRenaming(false);
                router.refresh();
              }
            }}
            className="flex gap-2"
          >
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              maxLength={MAX_GROUP_NAME}
              autoFocus
              className="min-w-0 flex-1 rounded-lg border border-coal-600 bg-coal-900 px-3 py-2 text-lg text-bone focus:border-volt focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !draftName.trim()}
              className="shrink-0 rounded-full bg-volt px-4 py-2 text-sm font-bold text-coal-950 disabled:opacity-30"
            >
              {t(locale, "groups_save")}
            </button>
            <button
              type="button"
              onClick={() => {
                setRenaming(false);
                setDraftName(name);
              }}
              className="shrink-0 rounded-full border border-coal-600 px-4 py-2 text-sm text-bone/60"
            >
              {t(locale, "groups_cancel")}
            </button>
          </form>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-4xl uppercase text-bone">{name}</h1>
            {isOwner && (
              <button
                onClick={() => setRenaming(true)}
                className="rounded-full border border-coal-600 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-bone/50 transition hover:border-volt hover:text-volt"
              >
                {t(locale, "groups_rename")}
              </button>
            )}
          </div>
        )}

        <p className="mt-1 font-mono text-xs uppercase tracking-wide text-bone/40">
          {tn(locale, "groups_members", members.length)}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-coal-600 pt-5">
          <span className="font-mono text-xs uppercase tracking-widest text-bone/50">
            {t(locale, "groups_code")}
          </span>
          <span
            dir="ltr"
            className="rounded-lg bg-coal-900 px-4 py-2 font-mono text-xl tracking-[0.3em] text-volt"
          >
            {joinCode}
          </span>
          <button
            onClick={copyCode}
            className="rounded-full border border-coal-600 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-bone/60 transition hover:border-volt hover:text-volt"
          >
            {copied ? t(locale, "groups_copied") : t(locale, "groups_copy")}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-coral/30 bg-coral/5 px-4 py-3 text-sm text-coral">{error}</p>
      )}

      <div className="rounded-2xl border border-coal-600 bg-coal-800 p-6 md:p-8">
        <h2 className="font-display text-2xl uppercase text-bone">{t(locale, "groups_members_heading")}</h2>
        <ul className="mt-4 flex flex-col gap-2">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-xl border border-transparent bg-coal-900 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-bone">
                  {m.displayName}
                  {m.isMe && <span className="ms-1.5 font-normal text-bone/40">{t(locale, "you_marker")}</span>}
                </p>
                <p dir="ltr" className="truncate font-mono text-[11px] text-bone/40">
                  @{m.username}
                </p>
              </div>
              {m.isOwner && (
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-volt">
                  {t(locale, "groups_owner")}
                </span>
              )}
              {isOwner && !m.isMe && (
                <button
                  onClick={async () => {
                    if (await call(`/api/groups/${groupId}/members/${m.id}`, "DELETE")) router.refresh();
                  }}
                  disabled={busy}
                  className="shrink-0 rounded-full border border-coal-600 px-3 py-1 text-xs text-bone/50 transition hover:border-coral hover:text-coral disabled:opacity-30"
                >
                  {t(locale, "groups_remove")}
                </button>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-coal-600 pt-5">
          <button
            onClick={async () => {
              if (armed !== "leave") {
                setArmed("leave");
                return;
              }
              if (await call(`/api/groups/${groupId}/leave`, "POST")) router.push("/groups");
            }}
            disabled={busy}
            className="rounded-full border border-coal-600 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-bone/60 transition hover:border-coral hover:text-coral disabled:opacity-30"
          >
            {armed === "leave" ? t(locale, "groups_leave_confirm") : t(locale, "groups_leave")}
          </button>

          {isOwner && (
            <button
              onClick={async () => {
                if (armed !== "delete") {
                  setArmed("delete");
                  return;
                }
                if (await call(`/api/groups/${groupId}`, "DELETE")) router.push("/groups");
              }}
              disabled={busy}
              className="rounded-full border border-coral/40 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-coral transition hover:bg-coral/10 disabled:opacity-30"
            >
              {armed === "delete" ? t(locale, "groups_delete_confirm") : t(locale, "groups_delete")}
            </button>
          )}

          {isOwner && (
            <p className="w-full text-xs text-bone/40">{t(locale, "groups_owner_leaves_note")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
