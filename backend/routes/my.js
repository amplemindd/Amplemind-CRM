const router = require('express').Router();
const db = require('../config/db');
const wrap = require('../utils/wrap');
const cleanFor = require('../utils/clean');

const OPEN = "stage NOT IN ('Customer','Lost')";
const LEAD_FIELDS = ['business', 'contact', 'phone', 'city', 'product', 'stage', 'temperature', 'value', 'followup_date', 'renewal_date', 'notes'];
const TASK_STATUS = ['Open', 'In Progress', 'Done'];

// ---------- Dashboard numbers ----------
router.get('/dashboard', wrap(async (req, res) => {
  const id = req.user.id;
  const q = async sql => (await db.pool.query(sql, [id]))[0][0].v;
  res.json({
    openTasks: await q("SELECT COUNT(*) v FROM tasks WHERE employee_id=? AND status<>'Done'"),
    inProgress: await q("SELECT COUNT(*) v FROM tasks WHERE employee_id=? AND status='In Progress'"),
    dueToday: await q("SELECT COUNT(*) v FROM tasks WHERE employee_id=? AND status<>'Done' AND deadline=CURDATE()"),
    overdue: await q("SELECT COUNT(*) v FROM tasks WHERE employee_id=? AND status<>'Done' AND deadline<CURDATE()"),
    doneMonth: await q("SELECT COUNT(*) v FROM tasks WHERE employee_id=? AND status='Done' AND completed_at>=DATE_FORMAT(CURDATE(),'%Y-%m-01')"),
    myLeads: await q(`SELECT COUNT(*) v FROM customers WHERE ${OPEN}`),
    myCustomers: await q("SELECT COUNT(*) v FROM customers WHERE stage='Customer'"),
    followups: await q(`SELECT COUNT(*) v FROM customers WHERE ${OPEN} AND followup_date<=CURDATE()`),
  });
}));

// ---------- Tasks (sirf apne) ----------
router.get('/tasks', wrap(async (req, res) => {
  const [rows] = await db.pool.query(
    `SELECT * FROM tasks WHERE employee_id=?
     ORDER BY (status='Done'), FIELD(priority,'High','Medium','Low'), deadline IS NULL, deadline, id DESC`, [req.user.id]);
  res.json(rows);
}));

// Employee sirf status aur apna note badal sakta hai
router.put('/tasks/:id', wrap(async (req, res) => {
  const [[t]] = await db.pool.query('SELECT id, title, status FROM tasks WHERE id=? AND employee_id=?', [req.params.id, req.user.id]);
  if (!t) throw wrap.err(404, 'Task not found');
  const d = {};
  if ('status' in req.body) {
    if (!TASK_STATUS.includes(req.body.status)) throw wrap.err(400, 'Invalid status');
    d.status = req.body.status;
    d.completed_at = d.status === 'Done' ? db.now : null;
  }
  if ('remark' in req.body) d.remark = String(req.body.remark || '').trim() || null;
  if (Object.keys(d).length) await db.pool.query('UPDATE tasks SET ? WHERE id=?', [d, t.id]);
  // Task complete hote hi admin ko alert + task ki chat me line
  if (d.status === 'Done' && t.status !== 'Done') {
    await db.pool.query('INSERT INTO notifications SET ?', [{ kind: 'task_done', title: `${req.user.name} completed a task`, body: t.title + (d.remark ? ` - ${d.remark}` : ''), link: '/admin/tasks', employee_id: req.user.id, is_read: 0 }]);
    await db.pool.query('INSERT INTO messages SET ?', [{ task_id: t.id, employee_id: req.user.id, sender: 'system', sender_name: req.user.name, body: `${req.user.name} marked this task as completed${d.remark ? '. Note: ' + d.remark : ''}`, read_admin: 0, read_employee: 1 }]);
  }
  res.json({ ok: true });
}));

// ---------- Leads / customers (Sales Team ko sab leads dikhti hain) ----------
router.get('/customers', wrap(async (req, res) => {
  res.json((await db.pool.query('SELECT * FROM customers ORDER BY id DESC'))[0]);
}));

router.post('/customers', wrap(async (req, res) => {
  const d = cleanFor('customers', req.body, LEAD_FIELDS);
  if (!d.business) throw wrap.err(400, 'Business name is required');
  d.stage = d.stage || 'Lead';
  const [x] = await db.pool.query('INSERT INTO customers SET ?', [d]);
  res.json({ id: x.insertId });
}));

router.put('/customers/:id', wrap(async (req, res) => {
  const [[c]] = await db.pool.query('SELECT id FROM customers WHERE id=?', [req.params.id]);
  if (!c) throw wrap.err(404, 'Lead not found');
  const d = cleanFor('customers', req.body, LEAD_FIELDS);
  if (Object.keys(d).length) await db.pool.query('UPDATE customers SET ? WHERE id=?', [d, c.id]);
  res.json({ ok: true });
}));

// Dropdown ke liye product names (sirf naam, price nahi)
router.get('/products', wrap(async (req, res) => res.json((await db.pool.query('SELECT id,name FROM products ORDER BY name'))[0])));

// ---------- Salary slips (sirf apni) ----------
router.get('/salary', wrap(async (req, res) => {
  res.json((await db.pool.query('SELECT * FROM salary_slips WHERE employee_id=? ORDER BY slip_month DESC, id DESC', [req.user.id]))[0]);
}));
router.get('/departments', (req, res) => res.json(require('../config/departments')));

// ---------- Notices ----------
router.get('/announcements', wrap(async (req, res) => {
  res.json((await db.pool.query('SELECT * FROM announcements ORDER BY posted_on DESC, id DESC LIMIT 10'))[0]);
}));

// ---------- Attendance ----------
router.get('/attendance', wrap(async (req, res) => {
  const [rows] = await db.pool.query(
    `SELECT id, att_date, check_in, check_out, note, TIMESTAMPDIFF(MINUTE, check_in, check_out) AS minutes
     FROM attendance WHERE employee_id=? AND att_date>=DATE_FORMAT(CURDATE(),'%Y-%m-01') ORDER BY att_date DESC`, [req.user.id]);
  const [[{ d }]] = await db.pool.query('SELECT CURDATE() AS d');
  res.json({ today: rows.find(r => r.att_date === d) || null, rows });
}));

router.post('/attendance/check-in', wrap(async (req, res) => {
  try {
    await db.pool.query('INSERT INTO attendance (employee_id, employee, att_date, check_in) VALUES (?,?,CURDATE(),NOW())', [req.user.id, req.user.name]);
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') throw wrap.err(400, 'You have already checked in today');
    throw e;
  }
  res.json({ ok: true });
}));

router.post('/attendance/check-out', wrap(async (req, res) => {
  const [[a]] = await db.pool.query('SELECT id, check_out FROM attendance WHERE employee_id=? AND att_date=CURDATE()', [req.user.id]);
  if (!a) throw wrap.err(400, 'Please check in first');
  if (a.check_out) throw wrap.err(400, 'You have already checked out today');
  const note = String(req.body.note || '').trim() || null;
  await db.pool.query('UPDATE attendance SET check_out=NOW(), note=COALESCE(?, note) WHERE id=?', [note, a.id]);
  res.json({ ok: true });
}));

// ---------- Chat with admin (task_id nahi = seedhi chat, task_id = us task ki chat) ----------
router.get('/messages', wrap(async (req, res) => {
  const task_id = req.query.task_id || null;
  if (task_id) {
    const [[t]] = await db.pool.query('SELECT id FROM tasks WHERE id=? AND employee_id=?', [task_id, req.user.id]);
    if (!t) throw wrap.err(404, 'Task not found');
  }
  const where = task_id ? 'task_id=?' : 'employee_id=? AND task_id IS NULL';
  const arg = task_id || req.user.id;
  await db.pool.query(`UPDATE messages SET read_employee=1 WHERE ${where} AND sender='admin' AND read_employee=0`, [arg]);
  res.json((await db.pool.query(`SELECT id, task_id, employee_id, sender, sender_name, body, read_admin, read_employee, attach_type, attach_name, created_at FROM messages WHERE ${where} ORDER BY id`, [arg]))[0]);
}));

// Ek message ka attachment (sirf apni chat ka)
router.get('/messages/:id(\\d+)/file', wrap(async (req, res) => {
  const [[m]] = await db.pool.query('SELECT attach, attach_type, attach_name FROM messages WHERE id=? AND employee_id=? AND attach_type IS NOT NULL', [req.params.id, req.user.id]);
  if (!m) throw wrap.err(404, 'File not found');
  res.json({ data: m.attach, type: m.attach_type, name: m.attach_name });
}));

router.post('/messages', wrap(async (req, res) => {
  const body = String(req.body.body || '').trim();
  const att = require('../utils/chatAttach')(req.body);
  if (!body && !att.attach) throw wrap.err(400, 'Type a message first');
  const task_id = req.body.task_id || null;
  if (task_id) {
    const [[t]] = await db.pool.query('SELECT id FROM tasks WHERE id=? AND employee_id=?', [task_id, req.user.id]);
    if (!t) throw wrap.err(404, 'Task not found');
  }
  const [x] = await db.pool.query('INSERT INTO messages SET ?', [{ task_id, employee_id: req.user.id, sender: 'employee', sender_name: req.user.name, body: body.slice(0, 2000), read_admin: 0, read_employee: 1, ...att }]);
  res.json({ id: x.insertId });
}));

// Unread count (sidebar badge) + last admin message id (naya aane par toast)
router.get('/messages/summary', wrap(async (req, res) => {
  const [[m]] = await db.pool.query("SELECT COUNT(*) n, COALESCE(MAX(id),0) last FROM messages WHERE employee_id=? AND sender='admin' AND read_employee=0", [req.user.id]);
  const [[t]] = await db.pool.query("SELECT COUNT(*) n FROM tasks WHERE employee_id=? AND status<>'Done'", [req.user.id]);
  res.json({ unread: m.n, last: m.last, openTasks: t.n });
}));

// ---------- Apni profile + photo ----------
router.get('/profile', wrap(async (req, res) => {
  const [[e]] = await db.pool.query('SELECT id,name,role,department,phone,email,joined,address,photo,username FROM employees WHERE id=?', [req.user.id]);
  res.json(e);
}));
router.put('/profile', wrap(async (req, res) => {
  const photo = req.body.photo;
  if (photo && !/^data:image\/(jpeg|png|webp);base64,/.test(photo)) throw wrap.err(400, 'Please choose a valid image');
  if (photo && photo.length > 600000) throw wrap.err(400, 'Image is too large');
  await db.pool.query('UPDATE employees SET photo=? WHERE id=?', [photo || null, req.user.id]);
  res.json({ ok: true });
}));

module.exports = router;