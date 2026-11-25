import { api } from '../api';
import { addDays, daysFrom, dueLabel, wa } from '../utils';
import { COMPANY } from '../config';
import { useUI } from './UI';
import TodoRow from './TodoRow';

export const followMsg = c =>
  `Hi ${c.contact || ''}, just checking if you had a chance to review the quotation for ${c.product || 'our software'}. Happy to adjust it to suit ${c.business || 'you'}. – ${COMPANY}`;

// base = 'customers' (admin) ya 'my/customers' (employee)
export default function FollowRow({ c, onDone, base = 'customers' }) {
  const ui = useUI();
  const d = daysFrom(c.followup_date);
  const set = async (date, msg) => { try { await api('PUT', base + '/' + c.id, { followup_date: date }); ui.toast(msg); onDone(); } catch (e) { ui.toast(e.message, 'err'); } };
  return (
    <TodoRow title={c.business} tag={dueLabel(d)} tagTone={d < 0 ? 'red' : d === 0 ? 'amber' : 'gray'}
      sub={`${c.contact || ''} ${c.product ? '· ' + c.product : ''}`.trim() + ' — ' + followMsg(c)}
      actions={[
        { label: 'Send on WhatsApp', kind: 'wa', onClick: () => { wa(c.phone, followMsg(c)); set(addDays(3), 'Follow-up sent. Next one in 3 days.'); } },
        { label: 'Snooze 3 days', onClick: () => set(addDays(3), 'Snoozed for 3 days') },
        { label: 'Mark done', onClick: () => set('', 'Follow-up cleared') },
      ]} />
  );
}
