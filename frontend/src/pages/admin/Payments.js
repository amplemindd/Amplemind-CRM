import ListPage from '../../components/ListPage';
import Icon from '../../components/Icon';
import { api } from '../../api';
import { F, daysFrom, fmtDate, inr, today, wa } from '../../utils';
import { COMPANY } from '../../config';

const sum = (rows, f) => rows.reduce((a, r) => a + f(r), 0);
const STATUS = ['Pending', 'Partly paid', 'Paid'];
const MODES = ['Cash', 'UPI', 'Card', 'Net banking', 'Bank transfer', 'Cheque', 'Other']; // Payment plan / receive ke payment mode
const pend = r => (+r.total || 0) - (+r.paid || 0);
const isOverdue = r => r.next_due && r.next_due.slice(0, 10) < today() && r.status !== 'Paid';
// Auto reminder: due date se "remind_before" din pehle se dikhna shuru, bhejne ke baad aaj ke liye hat jata hai
const reminderDue = r => r.auto_reminder === 'On' && r.status !== 'Paid' && r.next_due && daysFrom(r.next_due.slice(0, 10)) <= (+r.remind_before || 0) && (r.last_reminded || '').slice(0, 10) !== today();
const when = r => { const d = daysFrom(r.next_due.slice(0, 10)); return d < 0 ? `overdue by ${-d} day${d < -1 ? 's' : ''}` : d === 0 ? 'due today' : `due in ${d} day${d > 1 ? 's' : ''}`; };
const message = r => `Hi ${r.client}, gentle reminder: ${inr(r.next_amount || pend(r))} instalment for ${r.for_what || 'your order'} is due on ${fmtDate(r.next_due)}. Total pending: ${inr(pend(r))}. Thank you! – ${COMPANY}`;

const sendReminder = async (r, reload, ui) => {
  wa(r.phone, message(r));
  try { await api('POST', `payments/${r.id}/reminded`); reload(); } catch (e) { ui.toast(e.message, 'err'); }
};

// Aaj ke liye jo reminders bhejne baaki hain
const Reminders = (rows, reload, ui) => {
  const due = rows.filter(reminderDue).sort((a, b) => a.next_due.localeCompare(b.next_due));
  const on = rows.filter(r => r.auto_reminder === 'On' && r.status !== 'Paid').length;
  if (!due.length) return <div className="remind ok"><Icon name="bell" /><span>No payment reminders due today. Auto reminder is on for <b>{on}</b> plan{on === 1 ? '' : 's'}.</span></div>;
  return (
    <div className="remind">
      <div className="rhead"><Icon name="bell" /><b>Payment reminders due ({due.length})</b><small>Tap Send to open WhatsApp with the message ready</small></div>
      {due.map(r => (
        <div className="rrow" key={r.id}>
          <div><b>{r.client}</b><small>{inr(r.next_amount || pend(r))} · {r.for_what || 'Payment'} · {when(r)} ({fmtDate(r.next_due)})</small></div>
          <div className="row-gap">
            <button className="btn sm wa" onClick={() => sendReminder(r, reload, ui)}><Icon name="chat" />Send reminder</button>
            <button className="btn sm" onClick={async () => { await api('POST', `payments/${r.id}/reminded`); ui.toast('Snoozed for today'); reload(); }}>Snooze</button>
          </div>
        </div>))}
    </div>);
};

const config = {
  noun: 'payment plan', primary: 'client', secondary: r => r.for_what, badges: ['status'], required: ['client', 'total'], drawerWide: true,
  title: 'Payments', desc: 'Track customer payments and instalments. Auto reminders tell you when an instalment is due.', addLabel: 'Add payment plan',
  top: Reminders,
  tabs: [['All', () => true], ...STATUS.map(s => [s, r => r.status === s]), ['Overdue', isOverdue]],
  filters: [{ field: 'status', label: 'Status', opts: STATUS }],
  period: { field: 'next_due' },
  cards: rows => [
    ['Total billed', sum(rows, r => +r.total || 0), false, 'file', 'blue'],
    ['Total received', sum(rows, r => +r.paid || 0), false, 'wallet', 'green'],
    ['Pending amount', sum(rows, pend), false, 'clock', 'amber'],
    ['Overdue amount', sum(rows.filter(isOverdue), pend), false, 'bell', 'red'],
    ['Reminders due', rows.filter(reminderDue).length, true, 'calendar', 'violet'],
  ],
  fields: [F('client', 'Client'), F('phone', 'Phone (for WhatsApp)'), F('for_what', 'For (e.g. Website)'), F('total', 'Total ₹', 'money'),
    F('paid', 'Paid ₹', 'money', { def: () => 0 }), F('next_due', 'Next instalment due date', 'date'), F('next_amount', 'Next instalment amount ₹', 'money'),
    F('method', 'Payment mode', 'select', { opts: MODES, def: () => 'Cash' }),
    F('status', 'Status', 'select', { opts: STATUS, def: () => 'Pending' }),
    F('auto_reminder', 'Auto reminder', 'select', { opts: ['On', 'Off'], def: () => 'On', section: 'Instalment reminders' }),
    F('remind_before', 'Remind me (days before due date)', 'number', { def: () => 2, hint: '0 = only on the due date' }),
    F('repeat_days', 'Instalment repeats every (days)', 'number', { hint: 'Optional. e.g. 30 = next due date moves 30 days after each payment' })],
  cols: ['client', 'for_what', 'method', 'total', 'paid', 'pending', 'next_due', 'status', 'auto_reminder'],
  labels: { for_what: 'For', method: 'Payment mode', total: 'Total (₹)', paid: 'Paid (₹)', pending: 'Pending (₹)', next_due: 'Next due', auto_reminder: 'Reminder', remind_before: 'Remind before (days)', repeat_days: 'Repeats every (days)', next_amount: 'Next instalment (₹)' },
  render: {
    client: r => <b>{r.client}</b>,
    auto_reminder: r => (r.auto_reminder === 'On' ? <span className="pill green">On · {+r.remind_before || 0}d before</span> : <span className="pill gray">Off</span>),
  },
  detailFields: ['phone', 'for_what', 'method', 'total', 'paid', 'pending', 'next_due', 'next_amount', 'auto_reminder', 'remind_before', 'repeat_days'],
  actions: (r, reload, ui) => [
    ...(r.status !== 'Paid' ? [['Receive', async () => {
      const v = await ui.ask(`Receive payment from ${r.client}`, [
        { name: 'amount', label: 'Amount received (₹)', type: 'number', def: r.next_amount || '', required: true },
        { name: 'method', label: 'Method', opts: MODES, def: r.method || 'UPI' },
        { name: 'reference', label: 'Reference / UTR (optional)' },
        { name: 'next_due', label: 'Next instalment date (optional)', type: 'date', hint: r.repeat_days ? `Blank = ${r.repeat_days} days after the last due date` : 'Leave blank if no more instalments' },
        { name: 'next_amount', label: 'Next instalment amount (optional)', type: 'number' }], 'Record payment');
      if (!v) return;
      try { const x = await api('POST', `payments/${r.id}/receive`, { amount: +v.amount, method: v.method, reference: v.reference, next_due: v.next_due || null, next_amount: v.next_amount || null }); ui.toast(`Payment recorded. Receipt ${x.receipt}`); reload(); }
      catch (e) { ui.toast(e.message, 'err'); }
    }], ['Remind', () => sendReminder(r, reload, ui)]] : []),
  ],
};

export default function Payments() {
  return <ListPage resource="payments" cfg={config} />;
}
