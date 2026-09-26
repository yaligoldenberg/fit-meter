"use client";

import { useEffect, useState } from "react";
import { Locale, t } from "@/lib/i18n";

type State = "checking" | "unsupported" | "ios_install" | "denied" | "off" | "on" | "busy";

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

/**
 * Opt-in for the 07:00 "who's #1" notification. `compact` is the dashboard prompt: it
 * disappears once notifications are on (or can't be) instead of taking up space daily.
 */
export default function PushToggle({
  locale,
  vapidPublicKey,
  compact = false,
}: {
  locale: Locale;
  vapidPublicKey: string | null;
  compact?: boolean;
}) {
  const [state, setState] = useState<State>("checking");
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      if (!vapidPublicKey) return setState("unsupported");
      const capable = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!capable) return setState(iosOutsideHomeScreen() ? "ios_install" : "unsupported");
      if (Notification.permission === "denied") return setState("denied");
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          // Re-send on every visit: cheap, and it heals a server that lost the row or a
          // browser now signed in as someone else.
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sub.toJSON()),
          });
        }
        setState(sub ? "on" : "off");
      } catch {
        setState("unsupported");
      }
    })();
  }, [vapidPublicKey]);

  async function enable() {
    if (!vapidPublicKey) return;
    setError(false);
    setState("busy");
    try {
      // Must run straight from the tap — Safari refuses permission prompts that aren't.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "denied" : "off");
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
  }

  if (state === "checking") return null;
  if (compact && (state === "on" || state === "unsupported" || state === "denied")) return null;

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
    <div className={compact ? "sheet flex flex-wrap items-center justify-between gap-4 p-5 md:px-9" : ""}>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">🏆 {t(locale, "push_title")}</p>
        <p className="mt-1 text-sm text-slate">{note}</p>
        {error && <p className="mt-1 text-sm text-flag-red">{t(locale, "push_error")}</p>}
      </div>
      {(state === "off" || state === "busy") && (
        <button
          type="button"
          onClick={enable}
          disabled={state === "busy"}
          className={`btn-primary shrink-0 ${compact ? "" : "mt-4"}`}
        >
          {t(locale, "push_enable")}
        </button>
      )}
      {state === "on" && !compact && (
        <button type="button" onClick={disable} className="btn-quiet mt-4 shrink-0">
          {t(locale, "push_disable")}
        </button>
      )}
    </div>
  );
}
