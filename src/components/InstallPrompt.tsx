"use client";

import { useEffect, useState } from "react";
import { Locale, t } from "@/lib/i18n";

const DISMISS_KEY = "fitmeter-install-dismissed";

/** Chrome/Android's install event — not in TypeScript's DOM lib. */
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android" | "other";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

function installed(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * "Add FitMeter to your home screen", for phones that haven't yet. A push can't carry
 * this message — on iPhone, web push only works *after* the site is on the home screen —
 * so it lives in the app, where everyone who opens it sees it once.
 *
 * Android Chrome hands us an install event and gets a real button; Safari has no API
 * for it, so iPhones get the two taps spelled out.
 */
export default function InstallPrompt({ locale }: { locale: Locale }) {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      // Storage blocked (private mode): just show it.
    }
    const phone = window.matchMedia("(pointer: coarse)").matches;
    if (dismissed || installed() || !phone) return;
    setPlatform(detectPlatform());

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallEvent);
    };
    const onInstalled = () => setPlatform(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Nothing to remember it in; hiding for this visit is the best we can do.
    }
    setPlatform(null);
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    setInstallEvent(null);
    if (outcome === "accepted") setPlatform(null);
  }

  if (!platform) return null;

  const how = platform === "ios" ? t(locale, "install_ios") : t(locale, "install_android");

  return (
    <div className="sheet mb-5 border-s-[3px] border-s-signal p-5 md:px-9">
      <p className="font-semibold text-ink">📲 {t(locale, "install_title")}</p>
      <p className="mt-1 text-sm text-slate">{t(locale, "install_body")}</p>
      {!installEvent && <p className="mt-2 text-sm font-medium text-ink">{how}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {installEvent && (
          <button type="button" onClick={install} className="btn-primary">
            {t(locale, "install_button")}
          </button>
        )}
        <button type="button" onClick={dismiss} className="btn-quiet">
          {t(locale, "install_dismiss")}
        </button>
      </div>
    </div>
  );
}
