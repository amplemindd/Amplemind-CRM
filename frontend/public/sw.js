/* Service worker: app band ho tab bhi push notification (message / task / call) phone ke notification bar me pop up + vibrate + sound ke saath. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {}); // install ke liye zaroori, kuch cache nahi karte

const sleep = ms => new Promise(r => setTimeout(r, ms));
// Vibration: pehle bahut halka tha. Ab lamba aur tez (jhatke 0.6 - 0.9 sec ke)
const MSG_VIBRATE = [700, 200, 700, 200, 1000];
const CALL_VIBRATE = [1500, 400, 1500, 400, 1500];     // call: lagatar, phone ki ring jaisa
const RING_STEP = 4000;                                // call ke notification ko har 4 sec me phir bajao
const RING_MAX = 12;                                   // zyada se zyada ~48 sec (server 40 sec me call missed kar deta hai)

// Har type ka apna emoji + rang, taaki notification bar me ek nazar me samajh aaye
const LOOK = {
  message: { icon: '💬', actions: [{ action: 'open', title: '💬 Open chat' }] },
  task: { icon: '📋', actions: [{ action: 'open', title: '📋 View task' }] },
  task_done: { icon: '✅', actions: [{ action: 'open', title: 'View' }] },
  missed_call: { icon: '📵', actions: [{ action: 'open', title: 'Open app' }] },
  call: { icon: '📞', actions: [{ action: 'answer', title: '📞 Answer' }, { action: 'close', title: 'Dismiss' }] },
};

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'Amplemind CRM', body: e.data ? e.data.text() : '' }; }
  const m = /^\/([^/]+)/.exec(d.url || '');
  const seg = m ? m[1] : 'admin';
  const icon = '/icons/' + seg + '-192.png';
  const badge = '/icons/badge.png'; // status bar ka chhota white icon

  // Call khatam / utha li gayi / cut gayi: bajta hua call notification band
  if (d.kind === 'call_end') {
    e.waitUntil((async () => {
      (await self.registration.getNotifications({ tag: 'crm-call' })).forEach(n => n.close());
      // Chrome ko push par koi notification dikhana zaroori hai, isliye ek khali notification dikhake turant hata dete hain
      await self.registration.showNotification('Amplemind', { tag: 'crm-end', silent: true, icon, badge });
      await sleep(300);
      (await self.registration.getNotifications({ tag: 'crm-end' })).forEach(n => n.close());
    })());
    return;
  }

  const call = d.kind === 'call';
  const look = LOOK[d.kind] || { icon: '🔔', actions: [] };
  // Same tag = app ke andar ka alert aur push ek hi notification banate hain (double nahi aata), har naye par phir vibrate hota hai
  const tag = call ? 'crm-call' : (d.kind ? 'crm-' + d.kind : 'crm-general');
  const show = () => self.registration.showNotification(`${look.icon} ${d.title || 'Amplemind CRM'}`, {
    body: d.body || (call ? 'Tap to answer' : ''), icon, badge, tag, renotify: true, silent: false,
    requireInteraction: call, vibrate: call ? CALL_VIBRATE : MSG_VIBRATE, actions: look.actions,
    data: { url: d.url || '/', kind: d.kind || '' }, timestamp: Date.now(),
  });
  e.waitUntil((async () => {
    // App screen par khula hai to wahan toast + sound + vibrate ho raha hai, notification nahi dikhana
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (wins.some(c => c.visibilityState === 'visible' && c.focused)) return;
    await show();
    if (call) {
      // Jab tak call uthayi na jaye ya cut na ho (call_end push aate hi notification hat jata hai) vibrate + ring chalta rahe.
      // Swipe karke hata do to bhi ruk jata hai.
      for (let i = 0; i < RING_MAX; i += 1) {
        await sleep(RING_STEP);
        if (!(await self.registration.getNotifications({ tag: 'crm-call' })).length) return;
        await show();
      }
      (await self.registration.getNotifications({ tag: 'crm-call' })).forEach(n => n.close());
    }
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'close') return;
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil((async () => {
    const target = new URL(url, self.location.origin);
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of wins) { if (new URL(c.url).pathname.startsWith(target.pathname)) { await c.focus(); return; } }
    if (self.clients.openWindow) await self.clients.openWindow(url);
  })());
});
