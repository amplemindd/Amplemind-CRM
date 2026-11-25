// Live alert bhejo (toast + sound dono taraf frontend me LiveProvider dikhata hai).
// to_role: 'admin' (sab admins) ya 'employee' (to_id = employee ki id)
const db = require('../config/db');

const notify = async ({ to_role, to_id = null, kind, title, body = '', link = '' }) => {
  try {
    await db.pool.query('INSERT INTO alerts SET ?', [{ to_role, to_id, kind, title: String(title).slice(0, 200), body: String(body || '').slice(0, 300), link }]);
  } catch (e) { console.error('notify error:', e.message); } // alert fail ho to bhi asli kaam na ruke
};

// Message ka chhota preview (text ho to text, nahi to photo / voice / document)
notify.preview = (body, attachType) => (body ? String(body).slice(0, 120)
  : ({ image: '📷 Photo', audio: '🎤 Voice message', file: '📎 Document' })[attachType] || 'New message');

module.exports = notify;