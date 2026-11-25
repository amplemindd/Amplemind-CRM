const router = require('express').Router();
const db = require('../config/db');
const wrap = require('../utils/wrap');

router.get('/', wrap(async (req, res) => {
  const q = async sql => (await db.pool.query(sql))[0][0].v;
  const open = "stage NOT IN ('Customer','Lost')";
  res.json({
    customers: await q("SELECT COUNT(*) v FROM customers WHERE stage='Customer'"),
    openLeads: await q(`SELECT COUNT(*) v FROM customers WHERE ${open}`),
    pipeline: await q(`SELECT COALESCE(SUM(value),0) v FROM customers WHERE ${open}`),
    pending: await q('SELECT COALESCE(SUM(total-paid),0) v FROM payments'),
    followups: await q(`SELECT COUNT(*) v FROM customers WHERE ${open} AND followup_date<=CURDATE()`),
    renewals: await q("SELECT COUNT(*) v FROM customers WHERE renewal_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(),INTERVAL 30 DAY)"),
    overdueTasks: await q("SELECT COUNT(*) v FROM tasks WHERE status<>'Done' AND deadline<CURDATE()"),
    paymentReminders: await q(`SELECT COUNT(*) v FROM payments WHERE auto_reminder='On' AND status<>'Paid' AND next_due IS NOT NULL
      AND next_due<=DATE_ADD(CURDATE(), INTERVAL COALESCE(remind_before,0) DAY) AND (last_reminded IS NULL OR last_reminded<CURDATE())`),
    collected: await q("SELECT COALESCE(SUM(amount),0) v FROM payment_history"),
    collectedMonth: await q("SELECT COALESCE(SUM(amount),0) v FROM payment_history WHERE paid_on>=DATE_FORMAT(CURDATE(),'%Y-%m-01')"),
    overduePayments: await q("SELECT COALESCE(SUM(total-paid),0) v FROM payments WHERE status<>'Paid' AND next_due<CURDATE()"),
    tasksDone: await q("SELECT COUNT(*) v FROM tasks WHERE status='Done'"),
    tasksOpen: await q("SELECT COUNT(*) v FROM tasks WHERE status<>'Done'"),
    adSpend: await q("SELECT COALESCE(SUM(spend),0) v FROM campaigns WHERE start_date>=DATE_SUB(CURDATE(),INTERVAL 30 DAY)"),
    adLeads: await q("SELECT COALESCE(SUM(leads),0) v FROM campaigns WHERE start_date>=DATE_SUB(CURDATE(),INTERVAL 30 DAY)"),
    activeEmployees: await q("SELECT COUNT(*) v FROM employees WHERE status='Active'"),
    presentToday: await q("SELECT COUNT(*) v FROM attendance a JOIN employees e ON e.id=a.employee_id WHERE a.att_date=CURDATE() AND e.status='Active'"),
    byProduct: (await db.pool.query(`SELECT p.name, SUM(c.stage='Customer') customers, SUM(c.stage NOT IN ('Customer','Lost')) leads
      FROM products p LEFT JOIN customers c ON c.product = p.name GROUP BY p.id, p.name`))[0],
    // Team performance: har active employee ka kaam
    team: (await db.pool.query(`SELECT e.id, e.name, e.role,
        (SELECT COUNT(*) FROM tasks t WHERE t.employee_id=e.id AND t.status<>'Done') AS open_tasks,
        (SELECT COUNT(*) FROM tasks t WHERE t.employee_id=e.id AND t.status='Done') AS done_tasks,
        (SELECT COUNT(*) FROM tasks t WHERE t.employee_id=e.id AND t.status<>'Done' AND t.deadline<CURDATE()) AS overdue,
        (SELECT COUNT(*) FROM attendance a WHERE a.employee_id=e.id AND a.att_date=CURDATE()) AS present
      FROM employees e WHERE e.status='Active' ORDER BY e.name`))[0],
  });
}));
module.exports = router;
