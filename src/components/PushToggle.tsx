"use client";

import { useCallback, useEffect, useState } from "react";
import { Locale, t } from "@/lib/i18n";

type State = "checking" | "unsupported" | "ios_install" | "denied" | "off" | "on" | "busy";

/** Fired after any toggle or dismissal so every copy on the page re-reads its state. */
const CHANGE_EVENT = "fitmeter-push-change";
const SNOOZE_KEY = "fitmeter-push-snoozed-until";
/** "Not now" is respected for two weeks, then the top card asks once more. */
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

/** VAPID public keys travel base64url-encoded; pushManager.subscribe wants raw bytes. */
function keyBytes(base64url: string): ArrayBuffer {
  const padded = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0)).buffer;
}

/**
 * iPhones only allow web push for sites added to the home screen and opened from there,
 * so in a Safari tab the honest thing to show is how to get there, not a dead button.
 */
function iosOutsideHomeScreen(): boolean {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

function snoozed(): boolean {
  try {
    return Number(localStorage.getItem(SNOOZE_KEY) ?? 0) > Date.now();
  } catch {
    return false;
  }
}

function announce() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Subscription state for this browser, kept in step across every PushToggle on the page. */
function usePush(vapidPublicKey: string | null) {
  const [state, setState] = useState<State>("checking");
  const [isSnoozed, setSnoozed] = useState(false);
  const [error, setError] = useState(false);

  const check = useCallback(async () => {
    setSnoozed(snoozed());
    if (!vapidPublicKey) return setState("unsupported");
    const capable = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!capable) return setState(iosOutsideHomeScreen() ? "ios_install" : "unsupported");
    if (Notification.permission === "denied") return setState("denied");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
      return sub;
    } catch {
      setState("unsupported");
    }
  }, [vapidPublicKey]);

  useEffect(() => {
    (async () => {
      const sub = await check();
      if (sub) {
        // Re-send on every visit: cheap, and it heals a server that lost the row or a
        // browser now signed in as someone else.
        fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub.toJSON()),
        }).catch(() => {});
      }
    })();
    const onChange = () => void check();
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, [check]);

  async function enable() {
    if (!vapidPublicKey) return;
    setError(false);
    setState("busy");
    try {
      // Must run straight from the tap — Safari refuses permission prompts that aren't.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidPublicKey) }));
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("subscribe failed");
      setState("on");
    } catch {
      setError(true);
      setState("off");
    }
    announce();
  }

  async function disable() {
    setError(false);
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setError(true);
      setState("on");
    }
    announce();
  }

  function snooze() {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
    } catch {
      // No storage: it hides for this visit only.
    }
    setSnoozed(true);
    announce();
  }

  return { state, isSnoozed, error, enable, disable, snooze };
}

/**
 * Opt-in for the 07:00 "who's #1" notification, in three placements:
 *
 * - `top` (dashboard, above everything): the ask. Only while it's off and not snoozed —
 *   the browser's own permission prompt never fires on load, only from this card's button.
 * - `bottom` (dashboard, end of page): a one-line status once it's on, or once the top
 *   card was dismissed, so it stays findable without taking the prime spot every day.
 * - `full` (profile): always shown, including why it can't be turned on here.
 */
export default function PushToggle({
  locale,
  vapidPublicKey,
  placement,
}: {
  locale: Locale;
  vapidPublicKey: string | null;
  placement: "top" | "bottom" | "full";
}) {
  const { state, isSnoozed, error, enable, disable, snooze } = usePush(vapidPublicKey);
  if (state === "checking") return null;

  const errorLine = error && <p className="mt-1 text-sm text-flag-red">{t(locale, "push_error")}</p>;

  if (placement === "top") {
    // iPhones in a Safari tab get the install banner instead; nothing to turn on here yet.
    if (!(state === "off" || state === "busy") || isSnoozed) return null;
    return (
      <div className="sheet mb-5 border-s-[3px] border-s-signal p-5 md:px-9">
        <p className="font-semibold text-ink">🏆 {t(locale, "push_title")}</p>
        <p className="mt-1 text-sm text-slate">{t(locale, "push_desc")}</p>
        {errorLine}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={enable} disabled={state === "busy"} className="btn-primary">
            {t(locale, "push_enable")}
          </button>
          <button type="button" onClick={snooze} className="btn-quiet">
            {t(locale, "install_dismiss")}
          </button>
        </div>
      </div>
    );
  }

  if (placement === "bottom") {
    const show = state === "on" || ((state === "off" || state === "busy") && isSnoozed);
    if (!show) return null;
    return (
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4 text-sm">
        <span className="text-slate">
          🏆 {t(locale, "push_title")} · {t(locale, state === "on" ? "push_status_on" : "push_status_off")}
        </span>
        <button
          type="button"
          onClick={state === "on" ? disable : enable}
          disabled={state === "busy"}
          className="text-slate underline underline-offset-4 hover:text-ink disabled:opacity-40"
        >
          {t(locale, state === "on" ? "push_disable" : "push_enable")}
        </button>
        {errorLine}
      </div>
    );
  }

  const note =
    state === "on"
      ? t(locale, "push_on")
      : state === "denied"
        ? t(locale, "push_denied")
        : state === "unsupported"
          ? t(locale, "push_unsupported")
          : state === "ios_install"
            ? t(locale, "push_ios_install")
            : t(locale, "push_desc");

  return (
    <div>
      <p className="font-semibold text-ink">🏆 {t(locale, "push_title")}</p>
      <p className="mt-1 text-sm text-slate">{note}</p>
      {errorLine}
      {(state === "off" || state === "busy") && (
        <button type="button" onClick={enable} disabled={state === "busy"} className="btn-primary mt-4">
          {t(locale, "push_enable")}
        </button>
      )}
      {state === "on" && (
        <button type="button" onClick={disable} className="btn-quiet mt-4">
          {t(locale, "push_disable")}
        </button>
      )}
    </div>
  );
}
