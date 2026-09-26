// FitMeter service worker. Push only — no offline caching, so a deploy is never shadowed
// by a stale cached page.

// Take over straight away, so a new version handles the next push and open tabs become
// controlled (client.navigate only works on those).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  // The tag changes daily so the new one alerts; yesterday's is cleared rather than
  // piling up next to it.
  const family = data.tag ? data.tag.replace(/-\d{4}-\d{2}-\d{2}$/, "") : null;
  const clearOld = family
    ? self.registration
        .getNotifications()
        .then((open) => open.forEach((n) => n.tag && n.tag.startsWith(family) && n.tag !== data.tag && n.close()))
        .catch(() => {})
    : Promise.resolve();
  // No badge: Android wants a transparent monochrome icon there, and the app icon would
  // show as a white square; without one it uses the browser's own.
  event.waitUntil(
    clearOld.then(() =>
      self.registration.showNotification(data.title || "FitMeter", {
        body: data.body || "",
        icon: "/icons/icon-192.png",
        tag: data.tag,
        lang: data.lang,
        dir: data.dir,
        data: { url: data.url || "/leaderboard" },
      })
    )
  );
});

// Tapping the notification brings an open FitMeter tab to the page if there is one, else
// opens one. navigate() rejects for a tab this worker doesn't control, so that falls back
// to focusing it, and failing that to a new window.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const client = windows.find((c) => c.url.startsWith(self.location.origin) && "focus" in c);
      if (!client) return self.clients.openWindow(url);
      return client
        .navigate(url)
        .then((c) => (c || client).focus())
        .catch(() => (client.url === url ? client.focus() : self.clients.openWindow(url)))
        .catch(() => self.clients.openWindow(url));
    })
  );
});
