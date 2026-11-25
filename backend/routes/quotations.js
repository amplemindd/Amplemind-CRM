const db = require('../config/db');
const wrap = require('../utils/wrap');
const calc = require('../utils/quoteCalc');

// Quotation number auto: QT-0001. Items se total / GST server par dobara nikalte hain (galat total save na ho)
module.exports = require('../utils/crud')('quotations', {
  readonly: ['subtotal', 'gst_amount', 'total', 'items'],
  beforeSave: async d => {
    if (!('items_json' in d)) return;
    let items = [];
    try { items = JSON.parse(d.items_json || '[]'); } catch (e) { throw wrap.err(400, 'Items are not valid'); }
    const c = calc(items, d.discount_pct, d.gst_on !== 0 && d.gst_on !== null, d.gst_rate ?? 18);
    if (!c.lines.length) throw wrap.err(400, 'Please add at least one item');
    d.items_json = JSON.stringify(c.lines);
    d.items = c.lines.map(l => `${l.name}${l.qty > 1 ? ' x' + l.qty : ''} - ${l.amount}`).join('\n');
    d.subtotal = c.subtotal; d.gst_amount = c.gst; d.total = c.total;
  },
  beforeCreate: async d => {
    if (d.no) return;
    const [[{ m }]] = await db.pool.query("SELECT COALESCE(MAX(CAST(SUBSTRING(no,4) AS UNSIGNED)),0) m FROM quotations WHERE no LIKE 'QT-%'");
    d.no = 'QT-' + String(m + 1).padStart(4, '0');
  },
});
