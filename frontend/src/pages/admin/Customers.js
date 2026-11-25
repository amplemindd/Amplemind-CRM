import ListPage from '../../components/ListPage';
import { F, daysFrom, wa } from '../../utils';
import { STAGES, COMPANY } from '../../config';

const SOURCES = ['Referral', 'Meta campaign', 'Google', 'Website', 'Walk-in', 'Cold call', 'Other'];
const monthKey = () => new Date().toISOString().slice(0, 7);

const config = {
  noun: 'lead', primary: 'business', secondary: r => r.contact, badges: ['stage', 'temperature'], required: ['business'],
  title: 'Customers & leads', desc: 'Manage prospects, track conversations and grow customer relationships.', addLabel: 'Add lead',
  tabs: [['All leads', () => true], ...STAGES.map(s => [s, r => r.stage === s])],
  filters: [{ field: 'temperature', label: 'Temperature', opts: ['Hot', 'Warm', 'Cold'] }, { field: 'lead_source', label: 'Source', opts: SOURCES }, { field: 'product', label: 'Product' }, { field: 'city', label: 'City' }],
  period: { field: 'created_at' },
  cards: rows => [
    ['Total leads', rows.length, true, 'users', 'blue'],
    ['New this month', rows.filter(r => String(r.created_at || '').slice(0, 7) === monthKey()).length, true, 'plus', 'violet'],
    ['Hot leads', rows.filter(r => r.temperature === 'Hot' && !['Customer', 'Lost'].includes(r.stage)).length, true, 'bell', 'red'],
    ['Follow-ups due', rows.filter(r => r.followup_date && daysFrom(r.followup_date.slice(0, 10)) <= 0 && !['Customer', 'Lost'].includes(r.stage)).length, true, 'calendar', 'amber'],
    ['Converted', rows.filter(r => r.stage === 'Customer').length, true, 'check', 'green'],
  ],
  fields: [F('business', 'Business'), F('contact', 'Contact person'), F('phone', 'Phone'), F('city', 'City'),
    F('product', 'Product', 'ref', { src: 'products' }), F('stage', 'Stage', 'select', { opts: STAGES, def: () => 'Lead' }),
    F('temperature', 'Temperature', 'select', { opts: ['Hot', 'Warm', 'Cold'] }),
    F('lead_source', 'Lead source', 'select', { opts: SOURCES }), F('referred_by', 'Referred by', 'text', { hint: 'If the lead came by a referral, who referred them?' }), F('value', 'Lead value ₹', 'money'),
    F('due', 'Amount due ₹', 'money'), F('followup_date', 'Next follow-up', 'date'), F('renewal_date', 'Renewal date', 'date'), F('notes', 'Notes', 'textarea')],
  cols: ['business', 'phone', 'city', 'product', 'stage', 'temperature', 'value', 'followup_date'],
  detailFields: ['phone', 'city', 'product', 'lead_source', 'referred_by', 'value', 'due', 'followup_date', 'renewal_date', 'notes'],
  labels: { lead_source: 'Lead source', referred_by: 'Referred by', temperature: 'Temp.', followup_date: 'Follow-up' },
  render: { phone: r => <div className="prim"><span>{r.phone || '—'}</span>{r.city && <small className="only-narrow">{r.city}</small>}</div> },
  actions: r => [['WhatsApp', () => wa(r.phone, `Hi ${r.contact || ''}, this is ${COMPANY}. `)]],
};

export default function Customers() {
  return <ListPage resource="customers" cfg={config} />;
}