import ListPage from '../../components/ListPage';
import { api } from '../../api';
import { COMPANY } from '../../config';
import { F, addDays, daysFrom, fmtDate, today, wa } from '../../utils';

const TYPES = ['Call', 'WhatsApp', 'Email', 'Meeting'];
const TYPE_TONE = { Call: 'blue', WhatsApp: 'green', Email: 'violet', Meeting: 'amber' };
const pending = r => !!r.followup_date;
const days = r => daysFrom(r.followup_date.slice(0, 10));
const status = r => (!pending(r) ? 'Completed' : days(r) < 0 ? 'Overdue' : days(r) === 0 ? 'Due today' : 'Upcoming');
const STATUS_TONE = { Completed: 'green', Overdue: 'red', 'Due today': 'blue', Upcoming: 'amber' };

const config = {
  noun: 'follow-up', primary: 'business', secondary: r => r.contact || r.phone, noAdd: true, noDelete: true,
  title: 'Follow-ups', desc: 'Track, schedule and manage all customer and lead follow-ups.',
  // Sirf wahi customers jinka follow-up set hai ya complete ho chuka hai
  base: r => r.followup_date || r.followup_done_at,
  tabs: [['All follow-ups', () => true], ['Today', r => pending(r) && days(r) === 0], ['Upcoming', r => pending(r) && days(r) > 0],
    ['Overdue', r => pending(r) && days(r) < 0], ['Completed', r => !pending(r)]],
  filters: [{ field: 'followup_type', label: 'Type', opts: TYPES }],
  cards: rows => {
    const l = rows.filter(r => r.followup_date || r.followup_done_at);
    return [
      ['Total follow-ups', l.length, true, 'calendar', 'blue'],
      ['Completed', l.filter(r => !pending(r)).length, true, 'check', 'green'],
      ['Pending', l.filter(pending).length, true, 'clock', 'amber'],
      ['Overdue', l.filter(r => pending(r) && days(r) < 0).length, true, 'bell', 'red'],
      ["Today's follow-ups", l.filter(r => pending(r) && days(r) === 0).length, true, 'calendar', 'violet'],
    ];
  },
  fields: [F('followup_date', 'Follow-up date', 'date', { def: () => addDays(1) }), F('followup_type', 'Type', 'select', { opts: TYPES, def: () => 'Call' }),
    F('followup_subject', 'Subject / note')],
  required: ['followup_date'],
  cols: ['business', 'followup_subject', 'followup_type', 'followup_date', 'status'],
  labels: { business: 'Customer / lead', followup_subject: 'Subject / note', followup_type: 'Type', followup_date: 'Follow-up date', status: 'Status' },
  detailFields: ['phone', 'followup_type', 'followup_date', 'followup_subject', 'status', 'notes'],
  render: {
    followup_type: r => (r.followup_type ? <span className={'pill ' + (TYPE_TONE[r.followup_type] || 'gray')}>{r.followup_type}</span> : <span className="muted">—</span>),
    followup_date: r => fmtDate(r.followup_date || r.followup_done_at),
    status: r => <span className={'pill ' + STATUS_TONE[status(r)]}>{status(r)}</span>,
  },
  csv: { followup_date: r => r.followup_date || r.followup_done_at || '', status },
  headerActions: (rows, reload, ui) => [['New follow-up', async () => {
    const names = [...new Set(rows.map(r => r.business).filter(Boolean))];
    if (!names.length) return ui.toast('Add a customer or lead first', 'err');
    const v = await ui.ask('New follow-up', [
      { name: 'business', label: 'Customer / lead', opts: names, def: names[0] },
      { name: 'date', label: 'Follow-up date', type: 'date', def: addDays(1), required: true },
      { name: 'type', label: 'Type', opts: TYPES, def: 'Call' },
      { name: 'subject', label: 'Subject / note' }], 'Save follow-up');
    if (!v) return;
    const c = rows.find(r => r.business === v.business);
    try { await api('PUT', 'customers/' + c.id, { followup_date: v.date, followup_type: v.type, followup_subject: v.subject, followup_done_at: '' }); ui.toast('Follow-up scheduled'); reload(); }
    catch (e) { ui.toast(e.message, 'err'); }
  }, 'plus']],
  actions: (r, reload, ui) => [
    ...(pending(r) ? [['Complete', async () => {
      try { await api('PUT', 'customers/' + r.id, { followup_date: '', followup_type: '', followup_subject: '', followup_done_at: today() }); ui.toast('Follow-up completed'); reload(); }
      catch (e) { ui.toast(e.message, 'err'); }
    }]] : []),
    ['WhatsApp', () => wa(r.phone, `Hi ${r.contact || ''}, just following up${r.followup_subject ? ' regarding ' + r.followup_subject : ''}. – ${COMPANY}`)],
  ],
};

export default function Followups() {
  return <ListPage resource="customers" cfg={config} />;
}
