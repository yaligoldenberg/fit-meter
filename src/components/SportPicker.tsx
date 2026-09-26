"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  WORKOUT_CATEGORY_ORDER,
  WORKOUT_TYPES,
  WORKOUT_TYPE_ORDER,
  WorkoutCategory,
  WorkoutTypeKey,
  typeLabel,
} from "@/lib/workoutTypes";
import { searchSports } from "@/lib/sportSearch";
import { Locale, StringKey, t } from "@/lib/i18n";

interface Option {
  key: WorkoutTypeKey;
  /** Alias the search matched on, shown as a hint beside the name. */
  via: string | null;
}

/**
 * Every sport under its heading, most-logged first within each — the list before typing.
 * `start` is the group's offset into the flattened list the keyboard moves through.
 */
const GROUPED: { category: WorkoutCategory; keys: WorkoutTypeKey[]; start: number }[] = [];
for (const category of WORKOUT_CATEGORY_ORDER) {
  const keys = WORKOUT_TYPE_ORDER.filter((key) => WORKOUT_TYPES[key].category === category);
  const prev = GROUPED[GROUPED.length - 1];
  GROUPED.push({ category, keys, start: prev ? prev.start + prev.keys.length : 0 });
}
const GROUPED_FLAT = GROUPED.flatMap((g) => g.keys);

/**
 * Sport picker: a search box over the full list, plus one-tap chips for the sports this
 * person actually logs. With fifty-odd sports a chip grid no longer fits, and scrolling
 * a list is slower than typing "spin" — but most people log the same two or three
 * things, so those stay a single tap away.
 */
export default function SportPicker({
  value,
  onChange,
  recentTypes,
  locale,
}: {
  value: WorkoutTypeKey;
  onChange: (key: WorkoutTypeKey) => void;
  recentTypes: WorkoutTypeKey[];
  locale: Locale;
}) {
  const baseId = useId();
  const inputId = `${baseId}-input`;
  const listId = `${baseId}-list`;
  const optionId = (i: number) => `${baseId}-opt-${i}`;

  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const searching = query.trim() !== "";
  const matches = useMemo(() => (searching ? searchSports(query) : []), [query, searching]);
  const noMatch = searching && matches.length === 0;

  // One flat list drives the keyboard, whichever way it's displayed. With no match, the
  // single option is the "Other" fallback, so Enter still does something sensible.
  const flat: Option[] = searching
    ? noMatch
      ? [{ key: "OTHER", via: null }]
      : matches
    : GROUPED_FLAT.map((key) => ({ key, via: null }));

  useEffect(() => {
    if (!open) return;
    document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    // optionId only depends on baseId, which never changes.
  }, [open, active]);

  function openList() {
    setOpen(true);
    setQuery("");
    // Start on the current sport so arrowing and the scroll position begin from it.
    setActive(Math.max(0, GROUPED_FLAT.indexOf(value)));
  }

  function close() {
    setOpen(false);
    setQuery("");
  }

  function select(key: WorkoutTypeKey) {
    onChange(key);
    close();
    // Dropping focus also puts the phone keyboard away once a sport is chosen.
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        openList();
        return;
      }
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => Math.min(flat.length - 1, Math.max(0, a + step)));
    } else if (e.key === "Enter") {
      // Closed, Enter does nothing — WorkoutForm never lets Enter submit (see there).
      if (!open) return;
      e.preventDefault();
      const option = flat[active];
      if (option) select(option.key);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      close();
    }
  }

  const recent = recentTypes.filter((key, i) => recentTypes.indexOf(key) === i).slice(0, 5);

  function renderOption(option: Option, i: number) {
    const isActive = i === active;
    const isCurrent = option.key === value;
    return (
      <li
        key={`${option.key}-${i}`}
        id={optionId(i)}
        role="option"
        aria-selected={isActive}
        onClick={() => select(option.key)}
        onMouseMove={() => setActive(i)}
        className={`flex cursor-pointer items-center gap-2.5 px-3.5 py-2 text-sm ${
          isActive ? "bg-chalk text-ink" : "text-slate"
        }`}
      >
        <span aria-hidden className="w-5 shrink-0 text-center text-slate-light">
          {WORKOUT_TYPES[option.key].icon}
        </span>
        <span className={`min-w-0 truncate ${isCurrent ? "font-semibold text-ink" : ""}`}>
          {typeLabel(option.key, locale)}
        </span>
        {option.via && (
          <span className="min-w-0 truncate text-[12px] text-slate-light">· {option.via}</span>
        )}
        {isCurrent && (
          <span aria-hidden className="ms-auto shrink-0 text-signal">
            ✓
          </span>
        )}
      </li>
    );
  }

  return (
    <div>
      <label htmlFor={inputId} className="caption mb-2.5 block">
        {t(locale, "field_type")}
      </label>
      <div className="relative">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 start-3.5 flex items-center text-slate-light"
        >
          {open ? "⌕" : WORKOUT_TYPES[value].icon}
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && flat.length > 0 ? optionId(active) : undefined}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={open ? query : typeLabel(value, locale)}
          placeholder={t(locale, "sport_search_placeholder")}
          onFocus={openList}
          onBlur={close}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className={`input ps-10 ${open ? "" : "font-semibold"}`}
        />

        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-label={t(locale, "sport_search_label")}
            // Keeps focus in the input when tapping a heading or the scrollbar, so the
            // list doesn't close out from under the click.
            onMouseDown={(e) => e.preventDefault()}
            className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto overscroll-contain rounded-sheet border border-ink bg-paper py-1"
          >
            {noMatch ? (
              <>
                <li role="presentation" className="px-3.5 pb-1 pt-2 text-sm text-slate">
                  {t(locale, "sport_no_match")}
                </li>
                <li
                  id={optionId(0)}
                  role="option"
                  aria-selected={active === 0}
                  onClick={() => select("OTHER")}
                  className="flex cursor-pointer items-center gap-2.5 bg-chalk px-3.5 py-2 text-sm font-semibold text-ink"
                >
                  <span aria-hidden className="w-5 shrink-0 text-center text-slate-light">
                    {WORKOUT_TYPES.OTHER.icon}
                  </span>
                  {t(locale, "sport_pick_other")}
                </li>
              </>
            ) : searching ? (
              matches.map((option, i) => renderOption(option, i))
            ) : (
              GROUPED.map((group) => (
                <li key={group.category} role="presentation">
                  <p className="caption px-3.5 pb-1.5 pt-3">{t(locale, `cat_${group.category}` as StringKey)}</p>
                  <ul role="group" aria-label={t(locale, `cat_${group.category}` as StringKey)}>
                    {group.keys.map((key, i) => renderOption({ key, via: null }, group.start + i))}
                  </ul>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {recent.length > 0 && (
        <div role="group" aria-label={t(locale, "sport_recent")} className="mt-2.5 flex flex-wrap gap-2">
          {recent.map((key) => {
            const on = key === value;
            return (
              <button
                type="button"
                key={key}
                aria-pressed={on}
                onClick={() => onChange(key)}
                className={`chip flex items-center gap-2 ${on ? "chip-on" : ""}`}
              >
                <span aria-hidden>{WORKOUT_TYPES[key].icon}</span>
                {typeLabel(key, locale)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
