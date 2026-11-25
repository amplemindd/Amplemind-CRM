// Admin yahan se task kisi ek employee ko assign karta hai (employee_id se)
const db = require('../config/db');
const link = require('../utils/employeeLink');
const notify = require('../utils/notify');
const sync = link('employee_id', 'employee');

module.exports = require('../utils/crud')('tasks', {
  beforeSave: async (d, req) => {
    await sync(d);
    if ('status' in d) d.completed_at = d.status === 'Done' ? db.now : null;
    // Edit ke time purana employee yaad rakho (sirf naye / badle employee ko notification bhejna hai)
    if (req && req.method === 'PUT') {
      const [[old]] = await db.pool.query('SELECT employee_id FROM tasks WHERE id=?', [req.params.id]);
      req._oldTask = old || null;
    }
  },
  beforeCreate: async d => { d.priority = d.priority || 'Medium'; d.status = d.status || 'Open'; },
  // Task save hone ke baad: employee ko notification + sound
  afterSave: async (d, req, id, created) => {
    if (!d.employee_id) return;
    const old = req._oldTask;
    if (!created && old && Number(old.employee_id) === Number(d.employee_id)) return; // wahi employee, sirf edit
    const [[t]] = await db.pool.query('SELECT title, priority, deadline FROM tasks WHERE id=?', [id]);
    if (!t) return;
    await notify({ to_role: 'employee', to_id: d.employee_id, kind: 'task', title: 'New task assigned',
      body: `${t.title}${t.priority ? ' · ' + t.priority : ''}${t.deadline ? ' · Due ' + t.deadline : ''}`, link: '/employee/tasks' });
  },
});