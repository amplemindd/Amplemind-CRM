import ListPage from '../../components/ListPage';
import { COMPANY } from '../../config';
import { printReceipt } from '../../printA4';
import { F, fmtDate, inr, wa } from '../../utils';

const sum = (rows, f) => rows.reduce((a, r) => a + f(r), 0);
const mk = off => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + off, 15).toISOString().slice(0, 7); };
const month = r => String(r.paid_on || '').slice(0, 7);

// Receipt WhatsApp par bhejna. Number na ho to pooch lete hain
const sendReceipt = async (r, ui) => {
  let phone = r.phone;
  if (!phone) {
    const v = await ui.ask('WhatsApp number', [{ name: 'phone', label: `Number of ${r.client}`, required: true, placeholder: '98xxxxxxxx' }], 'Open WhatsApp');
    if (!v) return; phone = v.phone;
  }
  wa(phone, `Hi ${r.client}, we have received ${inr(r.amount)} for ${r.for_what || 'your order'} on ${fmtDate(r.paid_on)} via ${r.method || 'payment'}${r.reference ? ' (Ref: ' + r.reference + ')' : ''}.\nReceipt no: ${r.receipt_no}\nThank you! – ${COMPANY}`);
};

const config = {
  noun: 'payment', primary: 'client', secondary: r => r.for_what, noAdd: true,
  title: 'Payment history', desc: 'View every payment received. Print a receipt or send it on WhatsApp.',
  filters: [{ field: 'client', label: 'Client' }, { field: 'method', label: 'Payment mode' }],
  period: { field: 'paid_on' },
  cards: rows => [
    ['Total payments', rows.length, true, 'wallet', 'green'],
    ['Total received', sum(rows, r => +r.amount || 0), false, 'rupee', 'blue'],
    ['This month', sum(rows.filter(r => month(r) === mk(0)), r => +r.amount || 0), false, 'calendar', 'violet'],
    ['Last month', sum(rows.filter(r => month(r) === mk(-1)), r => +r.amount || 0), false, 'chart', 'amber'],
    ['Average payment', rows.length ? Math.round(sum(rows, r => +r.amount || 0) / rows.length) : 0, false, 'file', 'blue'],
  ],
  fields: [F('receipt_no', 'Receipt no'), F('client', 'Client'), F('phone', 'Phone'), F('for_what', 'For'), F('method', 'Method'), F('reference', 'Reference'),
    F('amount', 'Amount', 'money'), F('paid_on', 'Date', 'date')],
  cols: ['receipt_no', 'client', 'for_what', 'amount', 'method', 'paid_on', 'reference'],
  labels: { receipt_no: 'Receipt no.', for_what: 'For', amount: 'Amount (₹)', method: 'Payment mode', paid_on: 'Payment date' },
  render: { client: r => <b>{r.client}</b>, receipt_no: r => <b style={{ color: 'var(--primary)' }}>{r.receipt_no}</b>, method: r => <span className="pill blue">{r.method || '—'}</span> },
  detailFields: ['receipt_no', 'phone', 'for_what', 'method', 'reference', 'amount', 'paid_on'],
  actions: (r, reload, ui) => [['Receipt', () => printReceipt(r)], ['WhatsApp', () => sendReceipt(r, ui)]],
};

export default function PaymentHistory() {
  return <ListPage resource="payment_history" cfg={config} />;
}
