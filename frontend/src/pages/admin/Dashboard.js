import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { greeting, inr } from '../../utils';
import { useAuth } from '../../components/AuthContext';
import Icon from '../../components/Icon';
import PageHead from '../../components/PageHead';
import StatCards from '../../components/StatCards';
import { useUI } from '../../components/UI';

const bar = (v, max) => <div className="hbar"><i style={{ width: Math.min(100, (v / Math.max(1, max)) * 100) + '%' }} /></div>;

// Admin ka Dashboard (backend: GET /api/dashboard sirf admin ke liye hai)
export default function Dashboard() {
  const ui = useUI();
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => api('GET', 'dashboard').then(r => { setD(r); setFailed(false); }), []);
  useEffect(() => {
    load().catch(e => { setFailed(true); ui.toast(e.message, 'err'); });
    const t = setInterval(() => { if (!document.hidden) load().catch(() => {}); }, 60000);
    return () => clearInterval(t);
  }, [load, ui]);

  if (failed && !d) {
    return <div className="panel empty"><Icon name="inbox" /><h3>Could not load the dashboard</h3><p>Please check your connection and try again.</p>
      <button className="btn primary" onClick={() => load().catch(e => ui.toast(e.message, 'err'))}>Try again</button></div>;
  }
  if (!d) return <div style={{ display: 'grid', gap: 14 }}>{[1, 2, 3, 4].map(i => <div className="sk" style={{ height: 70 }} key={i} />)}</div>;

  const n = v => Number(v) || 0;
  const first = String((user && user.name) || '').split(' ')[0];
  const attn = [
    ['Follow-ups due', n(d.followups), 'followups', 'bell', 'amber', 'Leads waiting for your call'],
    ['Payment reminders', n(d.paymentReminders), 'payments', 'wallet', 'amber', 'Reminders ready to send'],
    ['Overdue payments', n(d.overduePayments), 'payments', 'clock', 'red', 'Amount past its due date', true],
    ['Overdue tasks', n(d.overdueTasks), 'tasks', 'tasks', 'red', 'Tasks past their deadline'],
    ['Renewals in 30 days', n(d.renewals), 'customers', 'calendar', 'blue', 'Customers due for renewal'],
  ].filter(x => x[1] > 0);

  const tasksAll = n(d.tasksDone) + n(d.tasksOpen);
  const maxProd = Math.max(1, ...(d.byProduct || []).map(p => n(p.customers) + n(p.leads)));
  const cpl = n(d.adLeads) ? Math.round(n(d.adSpend) / n(d.adLeads)) : 0;

  return (
    <>
      <PageHead title={`${greeting()}${first ? ', ' + first : ''}`}
        desc={`${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}. ${attn.length ? 'Here is what needs your attention today.' : 'Everything looks good today.'}`}>
        <div className="row-gap">
          <Link className="btn" to="/admin/quotations/new"><Icon name="file" />New quotation</Link>
          <Link className="btn primary" to="/admin/customers"><Icon name="plus" />Add lead</Link>
        </div>
      </PageHead>

      <StatCards items={[
        ['Customers', n(d.customers), true, 'users', 'green'],
        ['Open leads', n(d.openLeads), true, 'columns', 'blue'],
        ['Pipeline value', n(d.pipeline), false, 'chart', 'violet'],
        ['Pending payments', n(d.pending), false, 'wallet', 'amber'],
        ['Collected this month', n(d.collectedMonth), false, 'rupee', 'green'],
        ['Present today', `${n(d.presentToday)} / ${n(d.activeEmployees)}`, true, 'check', 'blue'],
      ]} />

      <div className="dash">
        <div>
          <div className="sect"><h3>Needs your attention {attn.length > 0 && <em>{attn.length}</em>}</h3>
            {attn.length === 0 ? <div className="panel allgood"><h3>All clear</h3><p className="muted">No follow-ups, overdue payments or late tasks right now.</p></div> : (
              <div className="panel">{attn.map(([label, v, to, icon, tn, sub, money]) => (
                <Link className="attn" to={'/admin/' + to} key={label}>
                  <span className={'sico ' + tn}><Icon name={icon} /></span>
                  <div><b>{label}</b><small>{sub}</small></div>
                  <em className={tn === 'red' ? 'late' : ''}>{money ? inr(v) : v}</em>
                  <Icon name="arrow" />
                </Link>))}</div>)}
          </div>

          <div className="card"><h3>Team today <Link className="more" to="/admin/attendance">Attendance</Link></h3>
            {d.team.length === 0 ? <p className="muted">No active employees yet.</p> : d.team.map(m => (
              <div className="trow" key={m.id}>
                <span className="av sm">{String(m.name || '?')[0].toUpperCase()}</span>
                <div className="tmain"><b>{m.name}</b><small>{m.role || 'Employee'}</small></div>
                <div className="tstat">
                  <span className={'pill ' + (n(m.present) ? 'green' : 'gray')}>{n(m.present) ? 'Present' : 'Absent'}</span>
                  <small>{n(m.done_tasks)} done · {n(m.open_tasks)} open{n(m.overdue) > 0 && <b className="late"> · {n(m.overdue)} late</b>}</small>
                </div>
              </div>))}
          </div>
        </div>

        <div className="dash-side">
          <div className="card"><h3>Money</h3>
            <div className="prow"><span>Total collected</span><b>{inr(d.collected)}</b></div>
            <div className="prow"><span>This month</span><b>{inr(d.collectedMonth)}</b></div>
            <div className="prow"><span>Pending</span><b>{inr(d.pending)}</b></div>
            <div className="prow"><span>Overdue</span><b className={n(d.overduePayments) ? 'late' : ''}>{inr(d.overduePayments)}</b></div>
          </div>
          <div className="card"><h3>Tasks <Link className="more" to="/admin/tasks">See all</Link></h3>
            <div className="prow"><span>Completed</span><b>{n(d.tasksDone)}</b></div>
            <div className="prow"><span>Open</span><b>{n(d.tasksOpen)}</b></div>
            <div className="prow"><span>Overdue</span><b className={n(d.overdueTasks) ? 'late' : ''}>{n(d.overdueTasks)}</b></div>
            {bar(n(d.tasksDone), tasksAll)}
          </div>
          <div className="card"><h3>Products</h3>
            {(d.byProduct || []).length === 0 ? <p className="muted">Add products to see them here.</p> : d.byProduct.map(p => (
              <div className="prow" key={p.name} style={{ display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><span>{p.name}</span><small>{n(p.customers)} customers · {n(p.leads)} leads</small></div>
                {bar(n(p.customers) + n(p.leads), maxProd)}
              </div>))}
          </div>
          <div className="card"><h3>Ads (last 30 days)</h3>
            <div className="prow"><span>Spend</span><b>{inr(d.adSpend)}</b></div>
            <div className="prow"><span>Leads</span><b>{n(d.adLeads)}</b></div>
            <div className="prow"><span>Cost per lead</span><b>{n(d.adLeads) ? inr(cpl) : '—'}</b></div>
          </div>
        </div>
      </div>
    </>
  );
}