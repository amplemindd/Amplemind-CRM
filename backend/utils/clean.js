const SCHEMA = require('../config/schema');

// body me se sirf allowed columns lo. '' ko null banao, INT columns ko number banao.
module.exports = (table, body = {}, allowed = Object.keys(SCHEMA[table])) => {
  const out = {};
  for (const k of allowed) {
    if (!(k in body) || !(k in SCHEMA[table])) continue;
    let v = body[k];
    if (v === '' || v === undefined) v = null;
    else if (SCHEMA[table][k] === 'i' && v !== null) { v = parseInt(v, 10); if (Number.isNaN(v)) v = null; }
    out[k] = v;
  }
  return out;
};
