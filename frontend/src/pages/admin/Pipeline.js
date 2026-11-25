import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { fmtDate, inr, tone } from '../../utils';
import { STAGES } from '../../config';
import Icon from '../../components/Icon';
import PageHead from '../../components/PageHead';
import StatCards from '../../components/StatCards';
import { useUI } from '../../components/UI';

// Har stage me deal ke jeetne ka andaaza (weighted value ke liye)
const PROB = { Lead: 0.1, Contacted: 0.25, Quotation: 0.5, Negotiation: 0.75, Customer: 1, Lost: 0 };

export default function Pipeline() {
  const ui = useUI();
  const nav = useNavigate();
  const [rows, setRows] = useState(null);
  const [over, setOver] = useState('');
  const [q, setQ] = useState('');
  const [prod, setProd] = useState('');
  const load = useCallback(() => api('GET', 'customers').then(setRows), []);
  useEffect(() => { load().catch(e => ui.toast(e.message, 'err')); }, [load, ui]);
  const move = async (id, stage) => {
    const c = rows.find(x => x.id === +id); if (!c || c.stage === stage) return;
    setRows(rows.map(x => (x.id === c.id ? { ...x, stage } : x))); // turant dikhao
    try { await api('PUT', 'customers/' + c.id, { stage }); ui.toast(`${c.business} moved to ${stage}`); } catch (e) { ui.toast(e.message, 'err'); load(); }
  };
  const all = rows || [];
  const list = all.filter(x => (!prod || x.product === prod) && JSON.stringify(Object.values(x)).toLowerCase().includes(q.toLowerCase()));
  const open = list.filter(x => !['Customer', 'Lost'].includes(x.stage));
  const sum = a => a.reduce((t, x) => t + (+x.value || 0), 0);
  const won = list.filter(x => x.stage === 'Customer'), lost = list.filter(x => x.stage === 'Lost');
  const products = [...new Set(all.map(x => x.product).filter(Boolean))].sort();

  return (
    <>
      <PageHead title="Pipeline" desc="Track your leads and deals across stages. Drag a card to another column to change its stage.">
        <button className="btn primary" onClick={() => nav('/admin/customers')}><Icon name="plus" />Add lead / deal</button>
      </PageHead>
      {rows && <StatCards items={[
        ['Total deals', list.length, true, 'columns', 'violet'],
        ['Pipeline value', sum(open), false, 'wallet', 'blue'],
        ['Weighted value', Math.round(open.reduce((t, x) => t + (+x.value || 0) * (PROB[x.stage] || 0), 0)), false, 'chart', 'green'],
        ['Won revenue', sum(won), false, 'rupee', 'amber'],
        ['Win rate', won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) + '%' : '—', true, 'check', 'red'],
      ]} />}
      <div className="tools">
        <div className="search"><Icon name="search" /><input aria-label="Search" placeholder="Search lead, customer or deal…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <select className="sel" aria-label="Product" value={prod} onChange={e => setProd(e.target.value)}><option value="">Product: All</option>{products.map(p => <option key={p}>{p}</option>)}</select>
        {(q || prod) && <button className="btn sm" onClick={() => { setQ(''); setProd(''); }}>Clear</button>}
      </div>
      <div className="kan">
        {STAGES.map(s => {
          const r = list.filter(x => x.stage === s);
          return (
            <div key={s} className={'col ' + (over === s ? 'over' : '')} onDragOver={e => { e.preventDefault(); setOver(s); }} onDragLeave={() => setOver('')}
              onDrop={e => { setOver(''); move(e.dataTransfer.getData('id'), s); }}>
              <h4><span><span className={'pill ' + tone(s)}>{s}</span></span><small>{r.length} · {inr(sum(r))}</small></h4>
              {r.map(c => (
                <div className="kc" key={c.id} draggable onDragStart={e => e.dataTransfer.setData('id', String(c.id))}>
                  <b>{c.business}</b><span className="muted">{c.product || c.contact || '—'}</span>
                  <div className="v">{inr(c.value)}</div>
                  <div className="meta"><span>{c.followup_date ? 'Follow-up ' + fmtDate(c.followup_date) : 'No follow-up'}</span>{c.temperature && <span className={'pill ' + tone(c.temperature)}>{c.temperature}</span>}</div>
                  <select aria-label="Move to stage" value={c.stage} onChange={e => move(c.id, e.target.value)} style={{ marginTop: 8 }}>{STAGES.map(o => <option key={o}>{o}</option>)}</select>
                </div>))}
              {rows && r.length === 0 && <p className="muted" style={{ padding: '10px 6px', fontSize: 13 }}>No deals</p>}
            </div>);
        })}
      </div>
    </>
  );
}
