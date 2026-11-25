import { useNavigate } from 'react-router-dom';
import ListPage from '../../components/ListPage';
import { COMPANY } from '../../config';
import { printQuotation } from '../../printA4';
import { itemsOf } from '../../quote';
import { fmtDate, inr, wa } from '../../utils';

const STATUS = ['Draft', 'Sent', 'Accepted', 'Rejected'];
const summary = r => itemsOf(r).filter(i => i.name).slice(0, 2).map(i => i.name).join(', ');

const make = nav => ({
  noun: 'quotation', primary: 'no', secondary: r => r.client, badges: ['status'],
  title: 'Quotations', desc: 'Create, manage and track price quotations for your customers.', addLabel: 'Create quotation',
  onAdd: () => nav('/admin/quotations/new'), onEdit: r => nav('/admin/quotations/' + r.id),
  tabs: [['All', () => true], ...STATUS.map(s => [s, r => r.status === s])],
  filters: [{ field: 'status', label: 'Status', opts: STATUS }],
  period: { field: 'qdate' },
  cards: rows => [
    ['Total quotations', rows.length, true, 'file', 'blue'],
    ['Sent', rows.filter(r => r.status === 'Sent').length, true, 'arrow', 'violet'],
    ['Pending (draft)', rows.filter(r => r.status === 'Draft').length, true, 'clock', 'amber'],
    ['Accepted', rows.filter(r => r.status === 'Accepted').length, true, 'check', 'green'],
    ['Rejected', rows.filter(r => r.status === 'Rejected').length, true, 'x', 'red'],
  ],
  fields: [{ name: 'no', label: 'Quote no.' }, { name: 'client', label: 'Client' }, { name: 'qdate', label: 'Date', type: 'date' },
    { name: 'valid_till', label: 'Valid till', type: 'date' }, { name: 'total', label: 'Total', type: 'money' }],
  cols: ['no', 'client', 'items', 'total', 'valid_till', 'status'],
  labels: { no: 'Quote no.', items: 'Items / description', total: 'Amount (₹)', valid_till: 'Validity', client_phone: 'Phone', subtotal: 'Subtotal (₹)', discount_pct: 'Extra discount (%)', gst_amount: 'GST (₹)' },
  render: { client: r => <b>{r.client}</b>, no: r => <b style={{ color: 'var(--primary)' }}>{r.no}</b>, items: r => <span className="muted">{summary(r) || '—'}</span>,
    subtotal: r => inr(r.subtotal), gst_amount: r => (r.gst_amount ? inr(r.gst_amount) : '—'), discount_pct: r => (r.discount_pct ? r.discount_pct + '%' : '—') },
  detailFields: ['client', 'client_phone', 'qdate', 'valid_till', 'subtotal', 'discount_pct', 'gst_amount', 'total', 'notes'],
  csv: { items: r => summary(r) },
  actions: r => [
    ['Print', () => printQuotation(r)],
    ['WhatsApp', () => wa(r.client_phone, `Hello ${r.contact || r.client}, quotation ${r.no} from ${COMPANY}. Total: ${inr(r.total)}. Valid till ${fmtDate(r.valid_till)}.`)],
  ],
});

export default function Quotations() {
  const nav = useNavigate();
  return <ListPage resource="quotations" cfg={make(nav)} />;
}
