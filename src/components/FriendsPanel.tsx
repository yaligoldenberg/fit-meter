"use client";

import { useEffect, useState, FormEvent } from "react";
import { Locale, t } from "@/lib/i18n";

interface Person {
  friendshipId: string;
  id: string;
  username: string;
  displayName: string;
}

interface FriendsData {
  friends: Person[];
  incoming: Person[];
  outgoing: Person[];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export default function FriendsPanel({ locale }: { locale: Locale }) {
  const [data, setData] = useState<FriendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [username, setUsername] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // Removing a friend arms on the first tap and fires on the second, as in
  // GroupDetailPanel — the button sits under a thumb scrolling the list.
  const [armedRemove, setArmedRemove] = useState<string | null>(null);

  useEffect(() => {
    if (!armedRemove) return;
    const timer = setTimeout(() => setArmedRemove(null), 4000);
    return () => clearTimeout(timer);
  }, [armedRemove]);

  async function load() {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/friends");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setAddError(null);
    setAddSuccess(null);
    if (!username.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAddError(json.error ?? t(locale, "friends_generic_error"));
        return;
      }
      setAddSuccess(json.autoAccepted ? t(locale, "friends_now_friends") : t(locale, "friends_request_sent"));
      setUsername("");
      await load();
    } catch {
      setAddError(t(locale, "friends_network_error"));
    } finally {
      setAdding(false);
    }
  }

  /** One accept/decline/remove call; a failure is shown instead of silently reloading. */
  async function mutate(pendingKey: string, url: string, init: RequestInit) {
    setPendingAction(pendingKey);
    setActionError(null);
    try {
      const res = await fetch(url, init);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setActionError(json.error ?? t(locale, "friends_generic_error"));
        return;
      }
      await load();
    } catch {
      setActionError(t(locale, "friends_network_error"));
    } finally {
      setPendingAction(null);
      setArmedRemove(null);
    }
  }

  function respond(friendshipId: string, action: "accept" | "decline") {
    return mutate(friendshipId + action, `/api/friends/${friendshipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
  }

  function remove(friendshipId: string) {
    return mutate(friendshipId + "remove", `/api/friends/${friendshipId}`, { method: "DELETE" });
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-5xl leading-none text-ink md:text-6xl">{t(locale, "friends_heading")}</h1>

      {/* Add a friend */}
      <section className="sheet p-6">
        <h2 className="font-display text-3xl leading-none text-ink">{t(locale, "friends_add_heading")}</h2>
        <p className="mt-1 caption">
          {t(locale, "friends_add_by_username")}
        </p>
        <form onSubmit={onAdd} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            className="input flex-1"
            placeholder={t(locale, "friends_username_placeholder")}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={20}
          />
          <button
            type="submit"
            disabled={adding}
            className="btn-primary"
          >
            {adding ? t(locale, "friends_adding") : t(locale, "friends_add_button")}
          </button>
        </form>
        {addError && <p className="mt-2 text-sm text-flag-red">{addError}</p>}
        {addSuccess && <p className="mt-2 text-sm text-signal">{addSuccess}</p>}
      </section>

      {loading && <p className="text-sm text-slate-light">{t(locale, "loading_ellipsis")}</p>}
      {loadError && (
        <div className="sheet p-6">
          <p className="text-sm text-flag-red">{t(locale, "friends_load_error")}</p>
          <button
            onClick={load}
            className="mt-3 btn-quiet"
          >
            {t(locale, "retry")}
          </button>
        </div>
      )}

      {actionError && (
        <p className="border-s-[3px] border-flag-red bg-chalk px-4 py-3 text-sm text-flag-red">{actionError}</p>
      )}

      {data && (
        <>
          {/* Requests */}
          {data.incoming.length > 0 && (
            <section className="sheet p-6">
              <h2 className="font-display text-3xl leading-none text-ink">{t(locale, "friends_requests_heading")}</h2>
              <ul className="mt-4 flex flex-col divide-y divide-rule">
                {data.incoming.map((p) => (
                  <li key={p.friendshipId} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{p.displayName}</p>
                      <p className="truncate text-[13px] text-slate-light">@{p.username}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => respond(p.friendshipId, "accept")}
                        disabled={pendingAction === p.friendshipId + "accept"}
                        className="btn-primary px-4 py-1.5"
                      >
                        {t(locale, "accept")}
                      </button>
                      <button
                        onClick={() => respond(p.friendshipId, "decline")}
                        disabled={pendingAction === p.friendshipId + "decline"}
                        className="btn-quiet px-4 py-1.5 hover:border-flag-red hover:text-flag-red"
                      >
                        {t(locale, "decline")}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Sent */}
          {data.outgoing.length > 0 && (
            <section className="sheet p-6">
              <h2 className="font-display text-3xl leading-none text-ink">{t(locale, "friends_sent_heading")}</h2>
              <ul className="mt-4 flex flex-col divide-y divide-rule">
                {data.outgoing.map((p) => (
                  <li key={p.friendshipId} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{p.displayName}</p>
                      <p className="truncate text-[13px] text-slate-light">@{p.username}</p>
                    </div>
                    <button
                      onClick={() => remove(p.friendshipId)}
                      disabled={pendingAction === p.friendshipId + "remove"}
                      className="btn-quiet px-4 py-1.5 hover:border-flag-red hover:text-flag-red"
                    >
                      {t(locale, "cancel")}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Friends */}
          <section className="sheet p-6">
            <h2 className="font-display text-3xl leading-none text-ink">{t(locale, "friends_your_friends_heading")}</h2>
            {data.friends.length === 0 ? (
              <p className="mt-3 text-sm text-slate">{t(locale, "friends_empty")}</p>
            ) : (
              <ul className="mt-4 flex flex-col divide-y divide-rule">
                {data.friends.map((p) => (
                  <li key={p.friendshipId} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-rule text-[13px] font-semibold text-slate">
                        {initials(p.displayName)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">{p.displayName}</p>
                        <p className="truncate text-[13px] text-slate-light">@{p.username}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (armedRemove !== p.friendshipId) {
                          setArmedRemove(p.friendshipId);
                          return;
                        }
                        remove(p.friendshipId);
                      }}
                      disabled={pendingAction === p.friendshipId + "remove"}
                      className={
                        armedRemove === p.friendshipId
                          ? "shrink-0 rounded-full border border-flag-red px-3 py-1 text-xs font-semibold text-flag-red transition disabled:opacity-30"
                          : "shrink-0 rounded-full border border-rule px-3 py-1 text-xs text-slate transition hover:border-flag-red hover:text-flag-red disabled:opacity-30"
                      }
                    >
                      {armedRemove === p.friendshipId ? t(locale, "friends_remove_confirm") : t(locale, "remove")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
