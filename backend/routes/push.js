// Phone / browser ko push notification ke liye register karna (login ke baad)
const router = require('express').Router();
const db = require('../config/db');
const wrap = require('../utils/wrap');
const push = require('../utils/push');

router.get('/key', (req, res) => res.json({ key: push.publicKey() }));

router.post('/subscribe', wrap(async (req, res) => {
  const s = req.body.subscription || {};
  const endpoint = String(s.endpoint || ''), p256dh = s.keys && s.keys.p256dh, auth = s.keys && s.keys.auth;
  if (!endpoint || !p256dh || !auth) throw wrap.err(400, 'Bad subscription');
  const row = { user_role: req.user.role, user_id: req.user.id, app: String(req.body.app || '').slice(0, 40), endpoint, p256dh, auth };
  // Ek phone = ek endpoint. Doosra banda us phone par login kare to wahi row naye user ki ho jati hai
  const [[ex]] = await db.pool.query('SELECT id FROM push_subs WHERE endpoint=? LIMIT 1', [endpoint]);
  if (ex) await db.pool.query('UPDATE push_subs SET ? WHERE id=?', [row, ex.id]);
  else await db.pool.query('INSERT INTO push_subs SET ?', [row]);
  res.json({ ok: true });
}));

// Logout par: is phone ko notification bhejna band
router.post('/unsubscribe', wrap(async (req, res) => {
  await db.pool.query('DELETE FROM push_subs WHERE endpoint=?', [String(req.body.endpoint || '')]);
  res.json({ ok: true });
}));

module.exports = router;
