// Sirf HR department ke routes: employees, team attendance, salary slips
const router = require('express').Router();
const db = require('../config/db');
const wrap = require('../utils/wrap');
router.get('/employees/:id/documents', wrap(async (req, res) => {
  const [[e]] = await db.pool.query('SELECT aadhaar_photo FROM employees WHERE id=?', [req.params.id]);
  res.json({ aadhaar_photo: (e && e.aadhaar_photo) || '' });
}));
router.use('/employees', require('../utils/crud')('employees', {
  hide: ['password_hash', 'aadhaar_photo'],
  readonly: ['username', 'password_hash', 'login_enabled', 'last_login', 'department'],
}));
router.use('/attendance', require('./attendance'));
router.use('/salary_slips', require('./salary'));
module.exports = router;
