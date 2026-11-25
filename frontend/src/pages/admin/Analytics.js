import { useEffect, useState } from 'react';
import { api } from '../../api';
import { STAGES } from '../../config';
import PageHead from '../../components/PageHead';
import StatCards from '../../components/StatCards';
import { useUI } from '../../components/UI';
import { inr } from '../../utils';

const bar = (v, max) => <div className="hbar"><i style={{ width: Math.min(100, (v / Math.max(1, max)) * 100) + '%' }} /></div>;

export default function Analytics() {
  const ui = useUI();
  const [data, setData] = useState(null);
  useEffect(() => {
    Promise.all([api('GET', 'customers'), api('GET', 'payment_history'), api('GET', 'dashboard'), api('GET', 'quotations')])
      .then(([c, h, d, q]) => setData({ c, h, d, q })).catch(e => ui.toast(e.message, 'err'));
  }, [ui]);
  if (!data) return <div style={{ display: 'grid', gap: 14 }}>{[1, 2, 3].map(i => <div className="sk" style={{ height: 70 }} key={i} />)}</div>;

  const { c, h, d, q } = data;
  const won = c.filter(x => x.stage === 'Customer').length, lost = c.filter(x => x.stage === 'Lost').length;
  const maxStage = Math.max(1, ...STAGES.map(s => c.filter(x => x.stage === s).length));
  const group = (rows, key, val = () => 1) => Object.entries(rows.reduce((a, x) => { const k = x[key] || 'Other'; a[k] = (a[k] || 0) + val(x); return a; }, {})).sort((a, b) => b[1] - a[1]);
  const methods = group(h, 'method', x => +x.amount || 0);
  const sources = group(c, 'lead_source');
  const quoteStatus = group(q, 'status');
  const tasksAll = d.tasksDone + d.tasksOpen;

  return (
    <>
      <PageHead title="Analytics" desc="How your sales, collections and team are doing." />
      <StatCards items={[
        ['Leads and customers', c.length, true, 'users', 'blue'], ['Conversion', (c.length ? Math.round(won * 100 / c.length) : 0) + '%', true, 'chart', 'green'],
        ['Revenue received', h.reduce((a, x) => a + +x.amount, 0), false, 'rupee', 'violet'], ['Pending payments', d.pending, false, 'clock', 'amber'],
        ['Overdue payments', d.overduePayments, false, 'bell', 'red'],
      ]} />
      <div className="dash">
        <div>
          <div className="card"><h3>Leads by stage</h3>{STAGES.map(s => {
            const r = c.filter(x => x.stage === s);
            return <div className="prow" key={s} style={{ display: 'block' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{s}</span><small>{r.length} leads · {inr(r.reduce((a, x) => a + +x.value, 0))}</small></div>{bar(r.length, maxStage)}</div>;
          })}<p className="hint" style={{ marginTop: 8 }}>Won {won} · Lost {lost}</p></div>
          <div className="card"><h3>Where leads come from</h3>
            {sources.length ? sources.map(([k, v]) => <div className="prow" key={k} style={{ display: 'block' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{k}</span><small>{v}</small></div>{bar(v, sources[0][1])}</div>)
              : <p className="muted">Choose a lead source on each lead to see this.</p>}</div>
        </div>
        <div>
          <div className="card"><h3>Money received by method</h3>
            {methods.length ? methods.map(([m, v]) => <div className="prow" key={m}><span>{m}</span><b>{inr(v)}</b></div>) : <p className="muted">No payments recorded yet.</p>}
            <div className="prow"><span>This month</span><b>{inr(d.collectedMonth)}</b></div></div>
          <div className="card"><h3>Quotations</h3>{quoteStatus.length ? quoteStatus.map(([k, v]) => <div className="prow" key={k}><span>{k}</span><b>{v}</b></div>) : <p className="muted">No quotations yet.</p>}</div>
          <div className="card"><h3>Team tasks</h3>
            <div className="prow"><span>Completed</span><b>{d.tasksDone}</b></div><div className="prow"><span>Open</span><b>{d.tasksOpen}</b></div>
            <div className="prow"><span>Overdue</span><b className={d.overdueTasks ? 'late' : ''}>{d.overdueTasks}</b></div>
            {bar(d.tasksDone, tasksAll)}
            {d.team.map(m => <div className="prow" key={m.id} style={{ display: 'block' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{m.name}</span><small>{m.done_tasks} done · {m.open_tasks} open</small></div>{bar(m.done_tasks, m.done_tasks + m.open_tasks)}</div>)}</div>
        </div>
      </div>
    </>
  );
}
