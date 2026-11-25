const jwt = require('jsonwebtoken');
const db = require('../config/db');
const SECRET = require('../config/secret');

// Har request par token check hota hai. Employee ka login disable / delete karte hi uska access turant band ho jata hai.
const authenticate = async (req, res, next) => {
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : '';
    if (!token) return res.status(401).send('Please log in');
    let p;
    try { p = jwt.verify(token, SECRET); } catch (e) { return res.status(401).send('Session expired. Please log in again.'); }

    if (p.role === 'admin') {
      const [[a]] = await db.pool.query('SELECT id,name,username FROM admins WHERE id=?', [p.id]);
      if (!a) return res.status(401).send('Please log in');
      req.user = { role: 'admin', id: a.id, name: a.name || a.username, username: a.username };
    } else if (p.role === 'employee') {
      const [[e]] = await db.pool.query('SELECT id,name,username,role,phone,status,login_enabled,department FROM employees WHERE id=?', [p.id]);
      if (!e || !e.login_enabled || e.status === 'Inactive') return res.status(401).send('Your access is disabled. Please contact your admin.');
      req.user = { role: 'employee', id: e.id, name: e.name, username: e.username, title: e.role, phone: e.phone, department: e.department };
    } else return res.status(401).send('Please log in');
    next();
  } catch (e) { console.error(e); res.status(500).send(e.message); }
};

const requireRole = role => (req, res, next) =>
  req.user && req.user.role === role ? next() : res.status(403).send('You are not allowed to do this');

// Department ke hisab se access (e.g. sirf HR)
const requireDept = (...depts) => (req, res, next) =>
  req.user && req.user.role === 'employee' && depts.includes(req.user.department) ? next() : res.status(403).send('This section is not for your department');

module.exports = { authenticate, requireRole, requireDept };
