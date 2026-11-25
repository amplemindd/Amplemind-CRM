// Login (admin aur employee alag-alag), me, change-password
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const wrap = require('../utils/wrap');
const SECRET = require('../config/secret');
const DEPTS = require('../config/departments');
const limiter = require('../utils/rateLimit');
const { authenticate } = require('../middleware/auth');

const EXPIRES = process.env.JWT_EXPIRES || '12h';
const BAD = 'Invalid username or password';
const DUMMY = bcrypt.hashSync('not-a-real-password', 10); // user na mile tab bhi same time lage
const sign = (role, id) => jwt.sign({ role, id }, SECRET, { expiresIn: EXPIRES });
const creds = req => [String(req.body.username || '').trim().toLowerCase(), String(req.body.password || '')];

router.post('/admin-login', wrap(async (req, res) => {
  const [username, password] = creds(req);
  limiter.check(req, username);
  const [[a]] = await db.pool.query('SELECT * FROM admins WHERE username=?', [username]);
  const ok = await bcrypt.compare(password, a ? a.password_hash : DUMMY);
  if (!a || !ok) { limiter.fail(req, username); throw wrap.err(401, BAD); }
  limiter.clear(req, username);
  res.json({ token: sign('admin', a.id), user: { role: 'admin', id: a.id, name: a.name || a.username, username: a.username } });
}));

router.post('/employee-login', wrap(async (req, res) => {
  const [username, password] = creds(req);
  limiter.check(req, username);
  const [[e]] = await db.pool.query('SELECT * FROM employees WHERE username=?', [username]);
  const ok = await bcrypt.compare(password, e && e.password_hash ? e.password_hash : DUMMY);
  if (!e || !ok) { limiter.fail(req, username); throw wrap.err(401, BAD); }
  limiter.clear(req, username);
  // Department login page se aaya hai to employee usi department ka hona chahiye
  const dept = String(req.body.department || '');
  if (dept && DEPTS.some(d => d.key === dept) && e.department !== dept)
    throw wrap.err(403, `This login is not for the ${dept} department. Please use your own department's login page.`);
  if (!e.login_enabled || e.status === 'Inactive') throw wrap.err(403, 'Your login is disabled. Please contact your admin.');
  await db.pool.query('UPDATE employees SET last_login=NOW() WHERE id=?', [e.id]);
  res.json({ token: sign('employee', e.id), user: { role: 'employee', id: e.id, name: e.name, username: e.username, title: e.role, phone: e.phone, department: e.department } });
}));

router.get('/me', authenticate, (req, res) => res.json(req.user));

router.post('/change-password', authenticate, wrap(async (req, res) => {
  const current = String(req.body.current || ''), next = String(req.body.next || '');
  if (next.length < 6) throw wrap.err(400, 'New password must be at least 6 characters');
  const table = req.user.role === 'admin' ? 'admins' : 'employees';
  const [[row]] = await db.pool.query(`SELECT password_hash FROM \`${table}\` WHERE id=?`, [req.user.id]);
  if (!row || !(await bcrypt.compare(current, row.password_hash))) throw wrap.err(400, 'Current password is wrong');
  await db.pool.query(`UPDATE \`${table}\` SET password_hash=? WHERE id=?`, [await bcrypt.hash(next, 10), req.user.id]);
  res.json({ ok: true });
}));

module.exports = router;
