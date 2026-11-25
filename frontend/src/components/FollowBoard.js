import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { daysFrom } from '../utils';
import FollowRow from './FollowRow';
import Icon from './Icon';
import { useUI } from './UI';

// Follow-up list (Overdue / Today / Upcoming). Admin aur employee dono yahi use karte hain, bas base alag hai.
export default function FollowBoard({ base = 'customers' }) {
  const ui = useUI();
  const [rows, setRows] = useState(null);
  const load = useCallback(async () => {
    const c = await api('GET', base);
    setRows(c.filter(x => x.followup_date && !['Customer', 'Lost'].includes(x.stage)).sort((a, b) => a.followup_date.localeCompare(b.followup_date)));
  }, [base]);
  useEffect(() => { load().catch(e => ui.toast(e.message, 'err')); }, [load, ui]);

  if (rows === null) return <div className="sk" style={{ height: 60 }} />;
  if (rows.length === 0) return <div className="panel empty"><Icon name="bell" /><h3>No follow-ups scheduled</h3><p>Set a follow-up date on a customer or lead and it will show up here.</p></div>;
  const groups = [['Overdue', rows.filter(r => daysFrom(r.followup_date) < 0)], ['Today', rows.filter(r => daysFrom(r.followup_date) === 0)],
    ['Upcoming', rows.filter(r => daysFrom(r.followup_date) > 0)]].filter(g => g[1].length);
  return groups.map(([name, list]) => (
    <div className="sect" key={name}>
      <h3>{name} <em style={{ background: name === 'Overdue' ? 'var(--red)' : name === 'Today' ? 'var(--amber)' : 'var(--muted)' }}>{list.length}</em></h3>
      <div className="panel">{list.map(c => <FollowRow key={c.id} c={c} base={base} onDone={load} />)}</div>
    </div>));
}
