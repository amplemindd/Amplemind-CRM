// Live alert bhejo (toast + sound dono taraf frontend me LiveProvider dikhata hai) + phone par push notification (app band ho tab bhi).
// to_role: 'admin' (sab admins) ya 'employee' (to_id = employee ki id)
const db = require('../config/db');
const push = require('./push');

const notify = async ({ to_role, to_id = null, kind, title, body = '', link = '' }) => {
  try {
    await db.pool.query('INSERT INTO alerts SET ?', [{ to_role, to_id, kind, title: String(title).slice(0, 200), body: String(body || '').slice(0, 300), link }]);
  } catch (e) { console.error('notify error:', e.message); } // alert fail ho to bhi asli kaam na ruke
  push.send(to_role, to_id, { title: String(title).slice(0, 120), body: String(body || '').slice(0, 160), kind }); // intezaar nahi karte
};

// Message ka chhota preview (text ho to text, nahi to photo / voice / document)
notify.preview = (body, attachType) => (body ? String(body).slice(0, 120)
  : ({ image: '📷 Photo', audio: '🎤 Voice message', file: '📎 Document' })[attachType] || 'New message');

module.exports = notify;
