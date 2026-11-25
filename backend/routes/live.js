// Live alerts (notification + sound) aur voice calls. Admin aur employee dono yahi use karte hain.
// Call ka signaling HTTP polling se hota hai (WebSocket ki zaroorat nahi), audio WebRTC se seedha browser-to-browser jata hai.
const router = require('express').Router();
const db = require('../config/db');
const wrap = require('../utils/wrap');
const notify = require('../utils/notify');

const RING = 30;   // kitne second ring bajegi (frontend bhi yahi use karta hai)
const GRACE = 10;  // server ka safety time, uske baad ringing call apne aap "missed"
const LOST = 120;  // itne second tak koi ping na aaye (tab band / net gaya) tabhi chalti call band. Normal me call kabhi apne aap nahi katti

const isAdmin = req => req.user.role === 'admin';
const myRole = req => (isAdmin(req) ? 'admin' : 'employee');
const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// Chat me call ki line (system message) - unread count nahi badhta
const sysMsg = (c, text) => db.pool.query('INSERT INTO messages SET ?', [{ task_id: null, employee_id: c.employee_id, sender: 'system', sender_name: c.caller_name, body: text, read_admin: 1, read_employee: 1 }]);

// Offer me video line ho (m=video) to ye video call hai, warna voice call
const isVideo = c => /m=video /.test(String(c.offer || ''));

// Missed call: samne wale ko alert + chat me line
const missed = async c => {
  const to = c.caller_role === 'admin' ? 'employee' : 'admin';
  const v = isVideo(c);
  await notify({ to_role: to, to_id: to === 'employee' ? c.employee_id : null, kind: 'missed_call', title: `Missed ${v ? 'video ' : ''}call from ${c.caller_name}`, body: '', link: '' });
  await sysMsg(c, v ? '🎥 Missed video call' : '📞 Missed call');
};

// Purani ringing calls / atki hui active calls / purana data saaf
let lastSweep = 0;
const sweep = async force => {
  if (!force && Date.now() - lastSweep < 4000) return;
  lastSweep = Date.now();
  const [ring] = await db.pool.query("SELECT * FROM calls WHERE status='ringing' AND TIMESTAMPDIFF(SECOND, created_at, NOW()) > ?", [RING + GRACE]);
  for (const c of ring) {
    const [x] = await db.pool.query("UPDATE calls SET status='missed', ended_at=NOW(), end_reason='timeout' WHERE id=? AND status='ringing'", [c.id]);
    if (x.affectedRows) await missed(c);
  }
  await db.pool.query("UPDATE calls SET status='ended', ended_at=NOW(), end_reason='lost' WHERE status='active' AND TIMESTAMPDIFF(SECOND, ping, NOW()) > ?", [LOST]);
  await db.pool.query('DELETE FROM alerts WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)');
  await db.pool.query('DELETE FROM calls WHERE created_at < DATE_SUB(NOW(), INTERVAL 2 DAY)');
};

// WebRTC ke ICE servers. STUN hamesha. TURN (audio/video jodne ke liye zaroori, khaaskar mobile data / office wifi par) 2 tareeke se:
//  1) TURN_URL + TURN_USERNAME + TURN_PASSWORD  (apna ya kisi bhi provider ka TURN; TURN_URL me comma se kai URL de sakte ho)
//  2) TURN_CREDENTIALS_URL  (Metered / Open Relay dashboard ka poora \"credentials\" URL, jisme apiKey laga hota hai)
// Key frontend ko nahi dikhti.
const STUN = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
const staticTurn = () => {
  const u = (process.env.TURN_URL || '').split(',').map(x => x.trim()).filter(Boolean);
  if (!u.length) return [];
  return [{ urls: u, username: process.env.TURN_USERNAME || '', credential: process.env.TURN_PASSWORD || '' }];
};
let iceCache = { at: 0, servers: null };
router.get('/ice', wrap(async (req, res) => {
  const own = staticTurn();
  const url = process.env.TURN_CREDENTIALS_URL;
  if (url && (!iceCache.servers || Date.now() - iceCache.at > 20 * 60 * 1000)) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const list = await r.json();
      if (Array.isArray(list) && list.length) iceCache = { at: Date.now(), servers: list };
    } catch (e) { console.error('TURN credentials error:', e.message); }
  }
  const remote = iceCache.servers || [];
  const servers = [...(remote.length ? [] : STUN), ...remote, ...own];
  res.json({ iceServers: servers, turn: !!(remote.length || own.length) });
}));

// Har kuch second me frontend yahi poll karta hai: naye alerts + incoming call
router.get('/poll', wrap(async (req, res) => {
  await sweep();
  const adm = isAdmin(req);
  const who = adm ? "to_role='admin'" : "to_role='employee' AND to_id=?";
  const wa = adm ? [] : [req.user.id];
  const [[l]] = await db.pool.query(`SELECT COALESCE(MAX(id),0) id FROM alerts WHERE ${who}`, wa);
  const after = parseInt(req.query.after, 10);
  const alerts = Number.isFinite(after)
    ? (await db.pool.query(`SELECT id, kind, title, body, link FROM alerts WHERE ${who} AND id>? ORDER BY id LIMIT 20`, [...wa, after]))[0] : [];
  const [[incoming]] = await db.pool.query(
    `SELECT id, caller_name AS from_name, offer, TIMESTAMPDIFF(SECOND, created_at, NOW()) AS age FROM calls
     WHERE status='ringing' AND ${adm ? "caller_role='employee'" : "caller_role='admin' AND employee_id=?"} AND TIMESTAMPDIFF(SECOND, created_at, NOW()) < ?
     ORDER BY id DESC LIMIT 1`, [...wa, RING + GRACE]);
  res.json({ alerts, last: l.id, incoming: incoming || null, ring: RING });
}));

// Nayi call shuru (offer = caller ka WebRTC description)
router.post('/calls', wrap(async (req, res) => {
  const adm = isAdmin(req);
  const employee_id = adm ? Number(req.body.employee_id) : req.user.id;
  if (!employee_id) throw wrap.err(400, 'Choose an employee');
  const offer = String(req.body.offer || '');
  if (!offer || offer.length > 100000) throw wrap.err(400, 'Call could not start. Try again.');
  let callee_name = 'Admin';
  if (adm) {
    const [[e]] = await db.pool.query('SELECT name FROM employees WHERE id=?', [employee_id]);
    if (!e) throw wrap.err(404, 'Employee not found');
    callee_name = e.name;
  }
  await sweep(true);
  if (adm) {
    const [[b]] = await db.pool.query("SELECT id FROM calls WHERE employee_id=? AND status IN ('ringing','active') LIMIT 1", [employee_id]);
    if (b) throw wrap.err(409, `${callee_name} is on another call. Try again in a moment.`);
  } else { // employee ki purani ringing call (agar koi atki ho) band
    await db.pool.query("UPDATE calls SET status='cancelled', ended_at=NOW() WHERE status='ringing' AND employee_id=? AND caller_role='employee'", [employee_id]);
  }
  const [x] = await db.pool.query('INSERT INTO calls SET ?', [{ employee_id, caller_role: myRole(req), caller_name: req.user.name, callee_name, status: 'ringing', offer, ping: db.now }]);
  res.json({ id: x.insertId });
}));

// Call ka haal (dono taraf ke log poll karte hain). ?got=1 = answer pehle mil chuka, dobara mat bhejo
const getCall = async (req, id) => {
  const [[c]] = await db.pool.query('SELECT * FROM calls WHERE id=?', [id]);
  if (!c) throw wrap.err(404, 'Call not found');
  if (!isAdmin(req) && c.employee_id !== req.user.id) throw wrap.err(403, 'Not allowed');
  return c;
};

router.get('/calls/:id(\\d+)', wrap(async (req, res) => {
  await sweep();
  await db.pool.query("UPDATE calls SET ping=NOW() WHERE id=? AND status IN ('ringing','active')", [req.params.id]);
  const c = await getCall(req, req.params.id);
  const mine = c.caller_role === myRole(req);
  res.json({ status: c.status, answer: mine && c.status === 'active' && !req.query.got ? c.answer : null });
}));

// Samne wala call utha raha hai (answer = uska WebRTC description)
router.post('/calls/:id(\\d+)/answer', wrap(async (req, res) => {
  const c = await getCall(req, req.params.id);
  if (c.caller_role === myRole(req)) throw wrap.err(400, 'You cannot answer your own call');
  const answer = String(req.body.answer || '');
  if (!answer || answer.length > 100000) throw wrap.err(400, 'Could not connect the call');
  const [x] = await db.pool.query("UPDATE calls SET status='active', answer=?, answered_at=NOW(), ping=NOW() WHERE id=? AND status='ringing'", [answer, c.id]);
  if (!x.affectedRows) throw wrap.err(409, 'This call is no longer available');
  res.json({ ok: true });
}));

// Call katna: ringing me caller kate = cancelled (missed), callee kate = declined; active me = ended
router.post('/calls/:id(\\d+)/end', wrap(async (req, res) => {
  const c = await getCall(req, req.params.id);
  const mine = c.caller_role === myRole(req);
  if (c.status === 'ringing') {
    const st = mine ? 'cancelled' : 'declined';
    const [x] = await db.pool.query("UPDATE calls SET status=?, ended_at=NOW(), end_reason=? WHERE id=? AND status='ringing'", [st, st, c.id]);
    if (x.affectedRows) { if (mine) await missed(c); else await sysMsg(c, '📞 Call declined'); }
  } else if (c.status === 'active') {
    const [x] = await db.pool.query("UPDATE calls SET status='ended', ended_at=NOW(), end_reason='hangup' WHERE id=? AND status='active'", [c.id]);
    if (x.affectedRows) {
      const [[d]] = await db.pool.query('SELECT TIMESTAMPDIFF(SECOND, answered_at, ended_at) AS s FROM calls WHERE id=?', [c.id]);
      await sysMsg(c, `${isVideo(c) ? '🎥 Video' : '📞 Voice'} call · ${mmss(Math.max(0, d.s || 0))}`);
    }
  }
  res.json({ ok: true });
}));

module.exports = router;