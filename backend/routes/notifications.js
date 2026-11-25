const router = require('express').Router();
const db = require('../config/db');
const wrap = require('../utils/wrap');

router.get('/', wrap(async (req, res) => {
  res.json((await db.pool.query('SELECT * FROM notifications ORDER BY id DESC LIMIT 40'))[0]);
}));
// kind=task_done jaise alerts ko "dekh liya" mark karo
router.post('/read', wrap(async (req, res) => {
  if (req.body.kind) await db.pool.query('UPDATE notifications SET is_read=1 WHERE kind=?', [req.body.kind]);
  else await db.pool.query('UPDATE notifications SET is_read=1');
  res.json({ ok: true });
}));
module.exports = router;
