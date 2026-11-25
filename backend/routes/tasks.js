// Admin yahan se task kisi ek employee ko assign karta hai (employee_id se)
const db = require('../config/db');
const link = require('../utils/employeeLink');
const sync = link('employee_id', 'employee');

module.exports = require('../utils/crud')('tasks', {
  beforeSave: async d => {
    await sync(d);
    if ('status' in d) d.completed_at = d.status === 'Done' ? db.now : null;
  },
  beforeCreate: async d => { d.priority = d.priority || 'Medium'; d.status = d.status || 'Open'; },
});
