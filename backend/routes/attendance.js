// Admin ke liye attendance: din ke hisab se aur mahine ke summary
const router = require('express').Router();
const db = require('../config/db');
const wrap = require('../utils/wrap');

// GET /api/attendance?date=2026-11-23  -> sab active employees, present ya absent
router.get('/', wrap(async (req, res) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : null;
  const [rows] = await db.pool.query(
    `SELECT e.id, e.name, e.role, a.check_in, a.check_out, a.note, TIMESTAMPDIFF(MINUTE, a.check_in, a.check_out) AS minutes
     FROM employees e LEFT JOIN attendance a ON a.employee_id=e.id AND a.att_date=COALESCE(?, CURDATE())
     WHERE e.status='Active' OR a.id IS NOT NULL ORDER BY e.name`, [date]);
  res.json(rows);
}));

// GET /api/attendance/summary?month=2026-11 -> har employee ke kitne din present, kitne ghante
router.get('/summary', wrap(async (req, res) => {
  const m = /^\d{4}-\d{2}$/.test(req.query.month || '') ? req.query.month + '-01' : null;
  const [rows] = await db.pool.query(
    `SELECT e.id, e.name, COUNT(a.id) AS days, COALESCE(SUM(TIMESTAMPDIFF(MINUTE, a.check_in, a.check_out)), 0) AS minutes
     FROM employees e LEFT JOIN attendance a ON a.employee_id=e.id
       AND a.att_date >= COALESCE(?, DATE_FORMAT(CURDATE(), '%Y-%m-01'))
       AND a.att_date < DATE_ADD(COALESCE(?, DATE_FORMAT(CURDATE(), '%Y-%m-01')), INTERVAL 1 MONTH)
     WHERE e.status='Active' GROUP BY e.id, e.name ORDER BY e.name`, [m, m]);
  res.json(rows);
}));

module.exports = router;
