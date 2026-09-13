"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Locale, t, tn } from "@/lib/i18n";
import { MAX_GROUP_NAME } from "@/lib/groupLimits";

interface GroupSummary {
  id: string;
  name: string;
  joinCode: string;
  memberCount: number;
  isOwner: boolean;
}

export default function GroupsPanel({ locale }: { locale: Locale }) {
  const [groups, setGroups] = useState<GroupSummary[] | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/groups");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setGroups(json.groups);
    } catch {
      setGroups([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(url: string, body: object, clear: () => void) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? t(locale, "generic_error"));
        return;
      }
      clear();
      await load();
    } catch {
      setError(t(locale, "generic_error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-5xl leading-none text-ink">{t(locale, "groups_title")}</h1>
        <p className="mt-1 text-sm text-slate">{t(locale, "groups_sub")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) submit("/api/groups", { name: name.trim() }, () => setName(""));
          }}
          className="sheet p-5"
        >
          <label
            htmlFor="group-name"
            className="caption"
          >
            {t(locale, "groups_create_heading")}
          </label>
          <div className="mt-3 flex gap-2">
            <input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_GROUP_NAME}
              placeholder={t(locale, "groups_create_placeholder")}
              className="input min-w-0 flex-1"
            />
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="btn-primary shrink-0"
            >
              {t(locale, "groups_create_cta")}
            </button>
          </div>
        </form>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) submit("/api/groups/join", { code: code.trim() }, () => setCode(""));
          }}
          className="sheet p-5"
        >
          <label
            htmlFor="group-code"
            className="caption"
          >
            {t(locale, "groups_join_heading")}
          </label>
          <div className="mt-3 flex gap-2">
            <input
              id="group-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={12}
              placeholder={t(locale, "groups_join_placeholder")}
              dir="ltr"
              className="input min-w-0 flex-1 uppercase tracking-[0.2em] placeholder:tracking-normal"
            />
            <button
              type="submit"
              disabled={busy || !code.trim()}
              className="btn-quiet shrink-0"
            >
              {t(locale, "groups_join_cta")}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <p className="border-s-[3px] border-flag-red bg-chalk px-4 py-3 text-sm text-flag-red">{error}</p>
      )}

      {groups === null && (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-chalk" />
          ))}
        </div>
      )}

      {groups !== null && groups.length === 0 && (
        <div className="flex flex-col items-center gap-2 sheet py-14 text-center">
          <p className="font-display text-3xl leading-none text-ink">{t(locale, "groups_empty")}</p>
          <p className="max-w-xs text-sm text-slate">{t(locale, "groups_empty_hint")}</p>
        </div>
      )}

      {groups !== null && groups.length > 0 && (
        <ul className="flex flex-col gap-3">
          {groups.map((g) => (
            <li key={g.id}>
              <Link
                href={`/groups/${g.id}`}
                className="flex items-center gap-4 sheet px-5 py-4 transition hover:border-signal"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-2xl leading-none text-ink">{g.name}</p>
                  <p className="mt-0.5 text-[13px] text-slate-light">
                    {tn(locale, "groups_members", g.memberCount)}
                    {g.isOwner && <span className="ms-2 text-signal">{t(locale, "groups_owner")}</span>}
                  </p>
                </div>
                <span
                  dir="ltr"
                  className="shrink-0 rounded-sheet border border-rule bg-chalk px-3 py-1.5 text-sm tracking-[0.2em] text-slate num-tabular"
                >
                  {g.joinCode}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
