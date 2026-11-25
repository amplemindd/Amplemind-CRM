/* Service worker: app band ho tab bhi push notification (message / task / call) dikhata hai. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {}); // install ke liye zaroori, kuch cache nahi karte

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'Amplemind CRM', body: e.data ? e.data.text() : '' }; }
  const call = d.kind === 'call';
  const m = /^\/app\/([^/]+)/.exec(d.url || '');
  const icon = '/icons/' + (m ? m[1] : 'admin') + '-192.png';
  e.waitUntil((async () => {
    // App screen par khula hai to wahan toast + sound ho raha hai, notification nahi dikhana
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (wins.some(c => c.visibilityState === 'visible' && c.focused)) return;
    await self.registration.showNotification(d.title || 'Amplemind CRM', {
      body: d.body || '', icon, badge: icon, tag: d.tag || undefined, renotify: !!d.tag,
      requireInteraction: call, vibrate: call ? [500, 250, 500, 250, 500, 250, 500] : [150, 80, 150],
      data: { url: d.url || '/' }, timestamp: Date.now(),
    });
    if (call) { // call ki notification 30 sec baad hata do (call tab tak kat chuki hogi)
      await new Promise(r => setTimeout(r, 30000));
      (await self.registration.getNotifications({ tag: 'call' })).forEach(n => n.close());
    }
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil((async () => {
    const target = new URL(url, self.location.origin);
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of wins) { if (new URL(c.url).pathname.startsWith(target.pathname)) { await c.focus(); return; } }
    if (self.clients.openWindow) await self.clients.openWindow(url);
  })());
});
