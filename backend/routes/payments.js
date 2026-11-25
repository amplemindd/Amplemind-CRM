const db = require('../config/db');
const wrap = require('../utils/wrap');
const router = require('../utils/crud')('payments', { readonly: ['last_reminded'] });

// Payment receive: paid update + history entry + receipt number + agli instalment ki date
router.post('/:id/receive', wrap(async (req, res) => {
  const { amount, method, reference, next_due, next_amount } = req.body;
  const amt = Number(amount);
  if (!(amt > 0)) throw wrap.err(400, 'Please enter the amount received');
  const conn = await db.pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[p]] = await conn.query('SELECT * FROM payments WHERE id=? FOR UPDATE', [req.params.id]);
    if (!p) throw wrap.err(404, 'Payment plan not found');
    const paid = Number(p.paid || 0) + amt;
    const done = paid >= Number(p.total);
    const upd = { paid, status: done ? 'Paid' : 'Partly paid', last_reminded: null };
    if (done) { upd.next_due = null; upd.next_amount = null; }
    else if (next_due) { upd.next_due = next_due; if (next_amount) upd.next_amount = Number(next_amount); }
    else if (p.repeat_days) upd.next_due = db.addDays(p.next_due, p.repeat_days);
    await conn.query('UPDATE payments SET ? WHERE id=?', [upd, p.id]);
    const [[{ m }]] = await conn.query("SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_no,4) AS UNSIGNED)),0) m FROM payment_history WHERE receipt_no LIKE 'RC-%'");
    const receipt = 'RC-' + String(m + 1).padStart(4, '0');
    await conn.query(`INSERT INTO payment_history (payment_id,receipt_no,client,phone,for_what,method,reference,amount,paid_on) VALUES (?,?,?,?,?,?,?,?,CURDATE())`,
      [p.id, receipt, p.client, p.phone, p.for_what, method, reference || null, amt]);
    await conn.commit();
    res.json({ ok: true, receipt });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}));

// "Reminder bhej diya" - aaj dobara na dikhe
router.post('/:id/reminded', wrap(async (req, res) => {
  await db.pool.query('UPDATE payments SET last_reminded=CURDATE() WHERE id=?', [req.params.id]);
  res.json({ ok: true });
}));
module.exports = router;
