// Web Push: app / browser band ho tab bhi phone ke upar notification bhejta hai.
// Zaroorat: .env me VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (keys banane ke liye: npm run vapid) aur `npm install web-push`.
const db = require('../config/db');

let wp = null, tried = false;
const init = () => {
  if (tried) return !!wp;
  tried = true;
  const { VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: priv, VAPID_SUBJECT: subject } = process.env;
  if (!pub || !priv) { console.log('Push: VAPID keys set nahi hain, isliye app band hone par notification nahi jayegi. (npm run vapid se keys banao)'); return false; }
  try { wp = require('web-push'); wp.setVapidDetails(subject || 'mailto:admin@example.com', pub, priv); return true; }
  catch (e) { wp = null; console.log('Push: web-push package nahi mila. `npm install` chalao:', e.message); return false; }
};

exports.publicKey = () => (init() ? process.env.VAPID_PUBLIC_KEY : null);

// to_role: 'admin' (sab admins) ya 'employee' (to_id = employee id). payload = { title, body, kind, tag }
exports.send = async (to_role, to_id, payload) => {
  try {
    if (!init()) return;
    const [subs] = to_role === 'admin'
      ? await db.pool.query("SELECT * FROM push_subs WHERE user_role='admin'")
      : await db.pool.query("SELECT * FROM push_subs WHERE user_role='employee' AND user_id=?", [to_id]);
    const call = payload.kind === 'call';
    await Promise.all(subs.map(async s => {
      const sub = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
      const body = JSON.stringify({ ...payload, url: s.app ? `/${s.app}/` : '/' }); // notification dabane par usi app me khule
      try { await wp.sendNotification(sub, body, { TTL: call ? 30 : 86400, urgency: 'high' }); }
      catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) await db.pool.query('DELETE FROM push_subs WHERE id=?', [s.id]); // phone ne app hata di
        else console.error('push error:', e.statusCode || e.message);
      }
    }));
  } catch (e) { console.error('push error:', e.message); }
};
