// Sirf HR department ke routes: employees, team attendance, salary slips
const router = require('express').Router();
const db = require('../config/db');
const wrap = require('../utils/wrap');
const DOCS = ['aadhaar_photo', 'passbook_photo', 'address_proof', 'resume', 'offer_letter'];
router.get('/employees/:id/documents', wrap(async (req, res) => {
  const [[e]] = await db.pool.query(`SELECT ${DOCS.join(',')} FROM employees WHERE id=?`, [req.params.id]);
  res.json(Object.fromEntries(DOCS.map(k => [k, (e && e[k]) || ''])));
}));
router.use('/employees', require('../utils/crud')('employees', {
  hide: ['password_hash', ...DOCS],
  readonly: ['username', 'password_hash', 'login_enabled', 'last_login', 'department'],
}));
router.use('/attendance', require('./attendance'));
router.use('/salary_slips', require('./salary'));
module.exports = router;
