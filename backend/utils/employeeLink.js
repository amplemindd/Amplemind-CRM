const db = require('../config/db');
const wrap = require('./wrap');

// Form se employee_id aata hai; uska naam bhi saath me save kar do (display ke liye)
module.exports = (idKey, nameKey) => async d => {
  if (!(idKey in d)) return;
  if (d[idKey] === null) { d[nameKey] = null; return; }
  const [[e]] = await db.pool.query('SELECT name FROM employees WHERE id=?', [d[idKey]]);
  if (!e) throw wrap.err(400, 'Employee not found');
  d[nameKey] = e.name;
};
