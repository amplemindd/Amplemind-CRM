import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { COMPANY, STAGES } from '../../config';
import { fmtDate, greeting, inr, timeAgo, today, tone, wa, daysFrom } from '../../utils';
import { useAuth } from '../../components/AuthContext';
import FollowRow from '../../components/FollowRow';
import PageHead from '../../components/PageHead';
import StatStrip from '../../components/StatStrip';
import TodoRow from '../../components/TodoRow';
import { useUI } from '../../components/UI';

const COLORS = { gray: 't-gray', blue: 't-blue', amber: 't-amber', violet: 't-violet', green: 't-green', red: 't-red' };

export default function Dashboard() {
  const ui = useUI();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const load = useCallback(async () => {
    const [d, c, p, t, n] = await Promise.all([api('GET', 'dashboard'), api('GET', 'customers'), api('GET', 'payments'), api('GET', 'tasks'), api('GET', 'notifications')]);
    setData({ d, c, p, t, n });
  }, []);
  useEffect(() => { load().catch(e => ui.toast(e.message, 'err')); }, [load, ui]);
  if (!data) return <div style={{ display: 'grid', gap: 16 }}>{[1, 2, 3].map(i => <div className="sk" style={{ height: 60 }} key={i} />)}</div>;

  const { d, c, p, t, n } = data, t0 = today();
  const fu = c.filter(x => x.followup_date && x.followup_date <= t0 && !['Customer', 'Lost'].includes(x.stage)).sort((a, b) => a.followup_date.localeCompare(b.followup_date));
  // Due ho chuki ya auto reminder wali payments (jinka reminder aaj bhejna baaki hai)
  const pay = p.filter(x => x.next_due && x.status !== 'Paid' && (x.next_due <= t0 || (x.auto_reminder === 'On' && daysFrom(x.next_due.slice(0, 10)) <= (+x.remind_before || 0) && (x.last_reminded || '').slice(0, 10) !== t0)));
  const tk = t.filter(x => x.status !== 'Done' && x.deadline && x.deadline < t0);
  const total = fu.length + pay.length + tk.length;
  const stageCount = STAGES.map(s => [s, c.filter(x => x.stage === s).length]);
  const maxP = Math.max(1, ...d.byProduct.map(x => (x.customers || 0) + (x.leads || 0)));
  const first = String((user && user.name) || '').split(' ')[0];

  return (
    <>
      <PageHead title={`${greeting()}${first ? ', ' + first : ''}`}
        desc={`${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}. ${total ? `${total} thing${total > 1 ? 's' : ''} need${total > 1 ? '' : 's'} you today.` : 'You are all caught up.'}`} />
      <StatStrip items={[['Open leads', d.openLeads, true], ['Pipeline value', d.pipeline], ['Payments pending', d.pending], ['Customers', d.customers, true],
        ['Renewals in 30 days', d.renewals, true], ['Ad spend, last 30 days', d.adSpend], ['Team present today', `${d.presentToday}/${d.activeEmployees}`, true]]} />
      <div className="dash">
        <div>
          {total === 0 && <div className="panel allgood"><h3>Nothing is due today</h3><p className="muted">A good time to add new leads.</p>
            <Link className="btn primary" style={{ marginTop: 14 }} to="/admin/customers">Go to customers</Link></div>}
          {fu.length > 0 && <div className="sect"><h3>Follow-ups due <em>{fu.length}</em></h3><div className="panel">{fu.map(x => <FollowRow key={x.id} c={x} onDone={load} />)}</div></div>}
          {pay.length > 0 && <div className="sect"><h3>Payments due <em>{pay.length}</em></h3><div className="panel">{pay.map(x => (
            <TodoRow key={x.id} title={x.client} tag={daysFrom(x.next_due) < 0 ? 'Overdue' : daysFrom(x.next_due) === 0 ? 'Due today' : 'Due soon'} tagTone={daysFrom(x.next_due) < 0 ? 'red' : 'amber'}
              sub={`${inr(x.total - x.paid)} pending for ${x.for_what || 'your order'}, due ${fmtDate(x.next_due)}`}
              actions={[{ label: 'Send reminder', kind: 'wa', onClick: async () => { wa(x.phone, `Hi ${x.client}, gentle reminder: ${inr(x.next_amount || x.total - x.paid)} is due on ${fmtDate(x.next_due)} for ${x.for_what}. Total pending: ${inr(x.total - x.paid)}. – ${COMPANY}`); await api('POST', `payments/${x.id}/reminded`); load(); } }]} />))}</div></div>}
          {tk.length > 0 && <div className="sect"><h3>Overdue tasks <em>{tk.length}</em></h3><div className="panel">{tk.map(x => (
            <TodoRow key={x.id} title={x.title} tag="Overdue" tagTone="red" sub={`${x.employee || 'Unassigned'}, was due ${fmtDate(x.deadline)}`}
              actions={[{ label: 'Mark done', kind: 'tint', onClick: async () => { await api('PUT', 'tasks/' + x.id, { status: 'Done' }); ui.toast('Task marked done'); load(); } }]} />))}</div></div>}
        </div>
        <div>
          <div className="card"><h3>Recent updates {n.some(x => !x.is_read) && <em>{n.filter(x => !x.is_read).length}</em>}</h3>
            {n.length === 0 ? <p className="muted">Task completions and other updates will show here.</p> : n.slice(0, 8).map(x => (
              <div className="upd" key={x.id}><i className={'dot ' + (x.is_read ? '' : 'on')} /><div><b>{x.title}</b><small>{x.body}</small></div><span>{timeAgo(x.created_at)}</span></div>))}
            <div className="row-gap" style={{ marginTop: 10 }}><Link className="btn sm" to="/admin/tasks">Open tasks</Link>
              {n.some(x => !x.is_read) && <button className="btn sm" onClick={async () => { await api('POST', 'notifications/read', {}); load(); }}>Mark all read</button>}</div></div>
          <div className="card"><h3>Team today <Link className="more" to="/admin/tasks">Tasks</Link></h3>
            {d.team.length === 0 ? <p className="muted">Add employees to see their work here.</p> : d.team.map(m => {
              const all = m.open_tasks + m.done_tasks;
              return (
                <div className="prow" key={m.id} style={{ display: 'block' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <span className="tm"><i className={'dot ' + (m.present ? 'on' : '')} title={m.present ? 'Present today' : 'Not checked in'} />{m.name}</span>
                    <small>{m.open_tasks} open · {m.done_tasks} done{m.overdue > 0 && <b className="late"> · {m.overdue} overdue</b>}</small>
                  </div>
                  <div className="hbar"><i style={{ width: (all ? (m.done_tasks / all) * 100 : 0) + '%' }} /></div>
                </div>);
            })}</div>
          <div className="card"><h3>Pipeline</h3>
            <div className="bar">{stageCount.map(([s, n]) => n > 0 && <i key={s} className={COLORS[tone(s)]} style={{ flex: n }} title={`${s}: ${n}`} />)}</div>
            <div className="legend">{stageCount.map(([s, n]) => <span key={s}><s className={COLORS[tone(s)]} />{s}<b>{n}</b></span>)}</div></div>
          <div className="card"><h3>Customers by product</h3>
            {d.byProduct.map(x => (
              <div className="prow" key={x.name} style={{ display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><span>{x.name}</span><small>{x.customers || 0} customers, {x.leads || 0} leads</small></div>
                <div className="hbar"><i style={{ width: (((x.customers || 0) + (x.leads || 0)) / maxP) * 100 + '%' }} /></div>
              </div>))}</div>
        </div>
      </div>
    </>
  );
}
