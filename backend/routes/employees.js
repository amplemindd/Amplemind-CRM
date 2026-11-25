// Employees + unka department login (admin yahin se username/password banata hai)
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const wrap = require('../utils/wrap');
const DEPTS = require('../config/departments');

const router = require('../utils/crud')('employees', {
  hide: ['password_hash', 'aadhaar_photo'], // aadhaar scan bhaari hai, list me nahi aata
  readonly: ['username', 'password_hash', 'login_enabled', 'last_login'],
});

// Aadhaar scan: sirf edit karte waqt alag se load hota hai
router.get('/:id/documents', wrap(async (req, res) => {
  const [[e]] = await db.pool.query('SELECT aadhaar_photo FROM employees WHERE id=?', [req.params.id]);
  if (!e) throw wrap.err(404, 'Employee not found');
  res.json({ aadhaar_photo: e.aadhaar_photo || '' });
}));

const checkDept = d => { if (!DEPTS.some(x => x.key === d)) throw wrap.err(400, 'Please choose a department'); };

// Login banao / password reset / enable-disable / department badlo
router.post('/:id/login', wrap(async (req, res) => {
  const [[e]] = await db.pool.query('SELECT * FROM employees WHERE id=?', [req.params.id]);
  if (!e) throw wrap.err(404, 'Employee not found');
  const username = String(req.body.username ?? e.username ?? '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const enabled = req.body.enabled === false ? 0 : 1;
  const department = String(req.body.department || e.department || '');
  checkDept(department);

  if (!/^[a-z0-9._-]{3,30}$/.test(username)) throw wrap.err(400, 'Username: 3-30 characters, only letters, numbers, dot, dash or underscore');
  const [[dup]] = await db.pool.query('SELECT id FROM employees WHERE username=? AND id<>?', [username, e.id]);
  if (dup) throw wrap.err(400, 'This username is already used by another employee');
  if (!e.password_hash && password.length < 6) throw wrap.err(400, 'Password must be at least 6 characters');
  if (password && password.length < 6) throw wrap.err(400, 'Password must be at least 6 characters');

  const d = { username, login_enabled: enabled, department };
  if (password) d.password_hash = await bcrypt.hash(password, 10);
  await db.pool.query('UPDATE employees SET ? WHERE id=?', [d, e.id]);
  res.json({ ok: true, username });
}));

// Naya employee + login ek saath (Employee logins page ka "New login")
router.post('/with-login', wrap(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const username = String(req.body.username || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const department = String(req.body.department || '');
  if (!name) throw wrap.err(400, 'Name is required');
  checkDept(department);
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) throw wrap.err(400, 'Username: 3-30 characters, only letters, numbers, dot, dash or underscore');
  if (password.length < 6) throw wrap.err(400, 'Password must be at least 6 characters');
  const [[dup]] = await db.pool.query('SELECT id FROM employees WHERE username=?', [username]);
  if (dup) throw wrap.err(400, 'This username is already used by another employee');
  const [x] = await db.pool.query('INSERT INTO employees SET ?', [{
    name, role: String(req.body.role || '').trim() || department, phone: String(req.body.phone || '').trim() || null,
    department, status: 'Active', joined: db.today, username, password_hash: await bcrypt.hash(password, 10), login_enabled: 1,
  }]);
  res.json({ id: x.insertId, username });
}));

module.exports = router;
