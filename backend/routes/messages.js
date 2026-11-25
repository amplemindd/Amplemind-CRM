// Admin ki chat: employee ke saath seedhi baat-cheet + task ki chat
const router = require('express').Router();
const db = require('../config/db');
const wrap = require('../utils/wrap');
const chatAttach = require('../utils/chatAttach');

// List me attachment ka bhaari data nahi bhejte (sirf type). Photo / audio alag se /:id/file se aata hai
const COLS = 'id, task_id, employee_id, sender, sender_name, body, read_admin, read_employee, attach_type, attach_name, created_at';

// Har employee ka thread: aakhri message + kitne unread
router.get('/threads', wrap(async (req, res) => {
  const [rows] = await db.pool.query(`SELECT e.id, e.name, e.role, e.department, e.status, e.photo,
      (SELECT body FROM messages m WHERE m.employee_id=e.id AND m.task_id IS NULL ORDER BY m.id DESC LIMIT 1) AS last_body,
      (SELECT attach_type FROM messages m WHERE m.employee_id=e.id AND m.task_id IS NULL ORDER BY m.id DESC LIMIT 1) AS last_attach,
      (SELECT created_at FROM messages m WHERE m.employee_id=e.id AND m.task_id IS NULL ORDER BY m.id DESC LIMIT 1) AS last_at,
      (SELECT COUNT(*) FROM messages m WHERE m.employee_id=e.id AND m.task_id IS NULL AND m.sender='employee' AND m.read_admin=0) AS unread,
      (SELECT COUNT(*) FROM messages m WHERE m.employee_id=e.id AND m.task_id IS NOT NULL AND m.sender='employee' AND m.read_admin=0) AS task_unread
    FROM employees e ORDER BY (last_at IS NULL), last_at DESC, e.name`);
  res.json(rows);
}));

// Ek chat ke messages (task_id nahi to seedhi chat). Khulte hi admin ke liye "read" ho jate hain
router.get('/', wrap(async (req, res) => {
  const { employee_id, task_id } = req.query;
  if (!employee_id && !task_id) throw wrap.err(400, 'Chat not found');
  const where = task_id ? 'task_id=?' : 'employee_id=? AND task_id IS NULL';
  const arg = task_id || employee_id;
  await db.pool.query(`UPDATE messages SET read_admin=1 WHERE ${where} AND sender='employee' AND read_admin=0`, [arg]);
  res.json((await db.pool.query(`SELECT ${COLS} FROM messages WHERE ${where} ORDER BY id`, [arg]))[0]);
}));

// Ek message ka attachment (photo / audio / document)
router.get('/:id(\\d+)/file', wrap(async (req, res) => {
  const [[m]] = await db.pool.query('SELECT attach, attach_type, attach_name FROM messages WHERE id=? AND attach_type IS NOT NULL', [req.params.id]);
  if (!m) throw wrap.err(404, 'File not found');
  res.json({ data: m.attach, type: m.attach_type, name: m.attach_name });
}));

router.post('/', wrap(async (req, res) => {
  const body = String(req.body.body || '').trim();
  const att = chatAttach(req.body);
  if (!body && !att.attach) throw wrap.err(400, 'Type a message first');
  let employee_id = req.body.employee_id; const task_id = req.body.task_id || null;
  if (task_id) {
    const [[t]] = await db.pool.query('SELECT employee_id FROM tasks WHERE id=?', [task_id]);
    if (!t || !t.employee_id) throw wrap.err(400, 'This task is not assigned to anyone yet');
    employee_id = t.employee_id;
  }
  if (!employee_id) throw wrap.err(400, 'Choose an employee');
  const [x] = await db.pool.query('INSERT INTO messages SET ?', [{ task_id, employee_id, sender: 'admin', sender_name: req.user.name, body: body.slice(0, 2000), read_admin: 1, read_employee: 0, ...att }]);
  res.json({ id: x.insertId });
}));

// Navbar / sidebar ke liye: unread messages + naye alerts (har 10 sec me poll hota hai)
router.get('/summary', wrap(async (req, res) => {
  const [[m]] = await db.pool.query("SELECT COUNT(*) n FROM messages WHERE sender='employee' AND read_admin=0");
  const [[t]] = await db.pool.query("SELECT COUNT(*) n FROM notifications WHERE is_read=0 AND kind='task_done'");
  const [items] = await db.pool.query('SELECT id, kind, title, body, link, created_at FROM notifications WHERE is_read=0 ORDER BY id DESC LIMIT 15');
  const [[last]] = await db.pool.query("SELECT COALESCE(MAX(id),0) id FROM messages WHERE sender='employee'");
  const [[pr]] = await db.pool.query(`SELECT COUNT(*) n FROM payments WHERE auto_reminder='On' AND status<>'Paid' AND next_due IS NOT NULL
      AND next_due<=DATE_ADD(CURDATE(), INTERVAL COALESCE(remind_before,0) DAY) AND (last_reminded IS NULL OR last_reminded<CURDATE())`);
  res.json({ messages: m.n, tasksDone: t.n, lastEmployeeMessage: last.id, paymentReminders: pr.n, items });
}));

module.exports = router;