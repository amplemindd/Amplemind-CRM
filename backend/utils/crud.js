const express = require('express');
const db = require('../config/db');
const SCHEMA = require('../config/schema');
const wrap = require('./wrap');
const cleanFor = require('./clean');

// Har table ke liye list / create / update / delete routes
// options: beforeSave(d, req) = create+update dono se pehle, beforeCreate(d) = sirf create se pehle,
//          afterSave(d, req, id, created) = save hone ke baad (notification jaise kaam),
//          hide = response se hataye gaye columns, readonly = form se kabhi write na hone wale columns
module.exports = (table, { beforeSave, beforeCreate, afterSave, hide = [], readonly = [] } = {}) => {
  const r = express.Router();
  const allowed = Object.keys(SCHEMA[table]).filter(k => !readonly.includes(k));
  const strip = row => { hide.forEach(k => delete row[k]); return row; };
  r.get('/', wrap(async (req, res) => res.json((await db.pool.query(`SELECT * FROM \`${table}\` ORDER BY id DESC`))[0].map(strip))));
  r.post('/', wrap(async (req, res) => {
    const d = cleanFor(table, req.body, allowed);
    if (beforeSave) await beforeSave(d, req);
    if (beforeCreate) await beforeCreate(d, req);
    const [x] = await db.pool.query(`INSERT INTO \`${table}\` SET ?`, [d]);
    if (afterSave) await afterSave(d, req, x.insertId, true);
    res.json({ id: x.insertId });
  }));
  r.put('/:id', wrap(async (req, res) => {
    const d = cleanFor(table, req.body, allowed);
    if (beforeSave) await beforeSave(d, req);
    if (Object.keys(d).length) await db.pool.query(`UPDATE \`${table}\` SET ? WHERE id=?`, [d, req.params.id]);
    if (afterSave) await afterSave(d, req, req.params.id, false);
    res.json({ ok: true });
  }));
  r.delete('/:id', wrap(async (req, res) => {
    await db.pool.query(`DELETE FROM \`${table}\` WHERE id=?`, [req.params.id]);
    res.json({ ok: true });
  }));
  return r;
};