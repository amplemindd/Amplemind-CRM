/* Service worker: app band ho tab bhi push notification (message / task / call) phone ke notification bar me dikhata hai. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {}); // install ke liye zaroori, kuch cache nahi karte

const sleep = ms => new Promise(r => setTimeout(r, ms));
const MSG_VIBRATE = [250, 120, 250, 120, 250];          // message / task: teen chhote jhatke
const CALL_VIBRATE = [900, 300, 900, 300, 900];         // call: lamba, phone ki ring jaisa

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'Amplemind CRM', body: e.data ? e.data.text() : '' }; }
  const call = d.kind === 'call';
  const m = /^\/([^/]+)/.exec(d.url || '');
  const icon = '/icons/' + (m ? m[1] : 'admin') + '-192.png';
  // Same tag = app ke andar ka alert aur push ek hi notification banate hain (double nahi aata), har naye par phir vibrate hota hai
  const tag = call ? 'crm-call' : (d.kind ? 'crm-' + d.kind : 'crm-general');
  const show = () => self.registration.showNotification(d.title || 'Amplemind CRM', {
    body: d.body || '', icon, badge: icon, tag, renotify: true, silent: false,
    requireInteraction: call, vibrate: call ? CALL_VIBRATE : MSG_VIBRATE,
    data: { url: d.url || '/' }, timestamp: Date.now(),
  });
  e.waitUntil((async () => {
    // App screen par khula hai to wahan toast + sound + vibrate ho raha hai, notification nahi dikhana
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (wins.some(c => c.visibilityState === 'visible' && c.focused)) return;
    await show();
    if (call) {
      // Call: har 5 sec me phir notification + vibrate (phone ki ring ki tarah), 30 sec tak. Swipe karke hata di to ruk jao.
      for (let i = 0; i < 5; i += 1) {
        await sleep(5000);
        if (!(await self.registration.getNotifications({ tag: 'crm-call' })).length) return;
        await show();
      }
      await sleep(5000);
      (await self.registration.getNotifications({ tag: 'crm-call' })).forEach(n => n.close());
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