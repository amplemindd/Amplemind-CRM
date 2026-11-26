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

// Login lamba chalta hai (phone app me baar-baar login na karna pade). Sirf Logout dabane par hi logout hota hai.
const EXPIRES = process.env.JWT_EXPIRES || '365d';
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

// Admin ka profile: photo, naam, username, email, phone
const adminOnly = req => { if (req.user.role !== 'admin') throw wrap.err(403, 'Only the admin can use this'); };

router.get('/profile', authenticate, wrap(async (req, res) => {
  adminOnly(req);
  const [[a]] = await db.pool.query('SELECT id,username,name,email,phone,photo FROM admins WHERE id=?', [req.user.id]);
  if (!a) throw wrap.err(404, 'Admin not found');
  res.json({ id: a.id, username: a.username, name: a.name || a.username, email: a.email || '', phone: a.phone || '', photo: a.photo || '' });
}));

router.put('/profile', authenticate, wrap(async (req, res) => {
  adminOnly(req);
  const b = req.body || {}, d = {};
  if ('name' in b) {
    d.name = String(b.name || '').trim();
    if (!d.name) throw wrap.err(400, 'Name is required');
  }
  if ('username' in b) {
    d.username = String(b.username || '').trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(d.username)) throw wrap.err(400, 'Username: 3-30 characters, only letters, numbers, dot, dash or underscore');
    const [[dup]] = await db.pool.query('SELECT id FROM admins WHERE username=? AND id<>?', [d.username, req.user.id]);
    if (dup) throw wrap.err(400, 'This username is already used');
  }
  if ('email' in b) {
    d.email = String(b.email || '').trim() || null;
    if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) throw wrap.err(400, 'Please enter a valid email');
  }
  if ('phone' in b) d.phone = String(b.phone || '').trim() || null;
  if ('photo' in b) {
    const p = String(b.photo || '');
    if (p && !/^data:image\//.test(p)) throw wrap.err(400, 'Please choose an image');
    if (p.length > 4000000) throw wrap.err(400, 'Photo is too large');
    d.photo = p || null;
  }
  if (Object.keys(d).length) await db.pool.query('UPDATE admins SET ? WHERE id=?', [d, req.user.id]);
  const [[a]] = await db.pool.query('SELECT username,name FROM admins WHERE id=?', [req.user.id]);
  res.json({ ok: true, username: a.username, name: a.name || a.username });
}));

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
