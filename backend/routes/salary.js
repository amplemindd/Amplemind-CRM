// Salary slips: admin aur HR dono yahi use karte hain
const db = require('../config/db');
const wrap = require('../utils/wrap');

const num = v => Number(v) || 0;

module.exports = require('../utils/crud')('salary_slips', {
  readonly: ['net', 'designation', 'employee'],
  beforeSave: async d => {
    if ('employee_id' in d) {
      if (!d.employee_id) throw wrap.err(400, 'Please choose an employee');
      const [[e]] = await db.pool.query('SELECT name, role, department FROM employees WHERE id=?', [d.employee_id]);
      if (!e) throw wrap.err(400, 'Employee not found');
      d.employee = e.name; d.designation = e.role || e.department || null;
    }
    if ('slip_month' in d && !/^\d{4}-\d{2}$/.test(d.slip_month || '')) throw wrap.err(400, 'Please choose the salary month');
    d.net = num(d.basic) + num(d.hra) + num(d.allowances) + num(d.bonus) - num(d.deductions);
  },
});
