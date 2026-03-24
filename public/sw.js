// WindCast Pro — Service Worker for Mobile Push Notifications
const CACHE_NAME = 'windcast-v2';
const API_KEY = '1f17f795128639f79920cea6fe9dcfd4';

// ── Install: cache shell ──────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(['/', '/index.html'])
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: serve from cache when offline ─────────────────────────────────────
self.addEventListener('fetch', event => {
  // Only cache same-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// ── Push: receive push from server (future) ───────────────────────────────────
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'WindCast Pro';
  const options = {
    body: data.body || 'Weather update available',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag || 'windcast-general',
    data: data.url || '/',
    vibrate: [200, 100, 200],
    actions: [
      { action: 'view', title: 'View Details' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes(self.location.origin));
      if (existing) { existing.focus(); return; }
      return self.clients.openWindow('/prediction');
    })
  );
});

// ── Message from main thread: check weather now ───────────────────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'WEATHER_POLL') {
    checkWeatherChanges(event.data.subscriptions || []);
  }
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Core: check subscribed cities for sudden changes ─────────────────────────
async function checkWeatherChanges(subscriptions) {
  const enabled = subscriptions.filter(s => s.enabled);
  if (enabled.length === 0) return;

  const updatedSubs = [];

  for (const sub of enabled) {
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(sub.city)}&appid=${API_KEY}&units=metric`,
        { cache: 'no-store' }
      );
      if (!res.ok) { updatedSubs.push(sub); continue; }
      const data = await res.json();
      const newSpeed = parseFloat(data.wind.speed.toFixed(1));
      const newTemp = parseFloat(data.main.temp.toFixed(1));

      if (sub.lastWindSpeed !== null && sub.lastWindSpeed !== undefined) {
        const speedDiff = newSpeed - sub.lastWindSpeed;
        const absChange = Math.abs(speedDiff);

        // Sudden wind change (≥ 3 m/s)
        if (absChange >= 3) {
          const direction = speedDiff > 0 ? 'increased ↑' : 'decreased ↓';
          await self.registration.showNotification('WindCast Pro — Wind Change', {
            body: `${sub.city}: Wind ${direction} by ${absChange.toFixed(1)} m/s\nNow ${newSpeed} m/s`,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `wc-change-${sub.city}`,
            vibrate: [100, 50, 100],
            data: { city: sub.city },
          });
        }

        // Threshold breach
        if (newSpeed > sub.windThreshold && sub.lastWindSpeed <= sub.windThreshold) {
          await self.registration.showNotification('WindCast Pro — Wind Alert ⚡', {
            body: `${sub.city}: Wind exceeded ${sub.windThreshold} m/s!\nCurrent: ${newSpeed} m/s`,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `wc-alert-${sub.city}`,
            vibrate: [200, 100, 200, 100, 200],
            data: { city: sub.city },
          });
        }
      }

      if (sub.lastTemp !== null && sub.lastTemp !== undefined) {
        const tempDrop = sub.lastTemp - newTemp;
        if (tempDrop >= sub.tempDropThreshold) {
          await self.registration.showNotification('WindCast Pro — Temperature Drop 🌡️', {
            body: `${sub.city}: Temp dropped ${tempDrop.toFixed(1)}°C\nNow ${newTemp}°C`,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `wc-temp-${sub.city}`,
            vibrate: [100, 50, 100],
            data: { city: sub.city },
          });
        }
      }

      // Energy opportunity (optimal 8-15 m/s)
      if (newSpeed >= 8 && newSpeed <= 15) {
        const score = Math.round((newSpeed / 15) * 100);
        if (score >= 65 && (sub.lastWindSpeed === null || Math.abs(newSpeed - sub.lastWindSpeed) >= 2)) {
          await self.registration.showNotification('WindCast Pro — Energy Window 🌿', {
            body: `${sub.city}: Optimal wind conditions!\nScore: ${score}/100 — ${newSpeed} m/s`,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `wc-energy-${sub.city}`,
            vibrate: [100, 50, 100],
            data: { city: sub.city },
          });
        }
      }

      updatedSubs.push({ ...sub, lastWindSpeed: newSpeed, lastTemp: newTemp });
    } catch (_) {
      updatedSubs.push(sub);
    }
  }

  // Send updated subscriptions back to all clients
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(client => client.postMessage({ type: 'SUBS_UPDATED', subscriptions: updatedSubs }));
}
