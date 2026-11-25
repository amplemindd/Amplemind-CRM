import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { addDays, csvDownload, fmtDate, inr, today, tone } from '../utils';
import FormDrawer from './FormDrawer';
import Icon from './Icon';
import PageHead from './PageHead';
import StatCards from './StatCards';
import StatStrip from './StatStrip';
import { useUI } from './UI';

const ACT_ICON = { WhatsApp: 'chat', Print: 'print', Receipt: 'download', Receive: 'rupee', Remind: 'bell', Done: 'check', Complete: 'check', Login: 'key' };
const LATE_COLS = ['followup_date', 'next_due', 'deadline', 'valid_till'];
const CLOSED = ['Done', 'Paid', 'Customer', 'Lost', 'Accepted', 'Rejected'];
const PERIODS = ['All time', 'Today', 'This month', 'Last month', 'Last 30 days'];

const ym = d => d.toISOString().slice(0, 7);
const inPeriod = (p, v) => {
  if (p === 'All time') return true;
  const s = String(v || '').slice(0, 10);
  if (!s) return false;
  const now = new Date();
  if (p === 'Today') return s === today();
  if (p === 'This month') return s.slice(0, 7) === today().slice(0, 7);
  if (p === 'Last month') return s.slice(0, 7) === ym(new Date(now.getFullYear(), now.getMonth() - 1, 15));
  return s >= addDays(-30) && s <= today();
};

// Common list page: cards + search + dropdown filters + tabs + select + pagination + detail panel + add/edit + delete + CSV export
// cfg: noun, title, desc, fields, cols, primary, secondary, badges, required
//   cards(rows) -> [[label, value, plain, icon, tone]]      summary(rows) -> purani simple strip
//   filter {field, opts} -> tabs      tabs [[label, row => bool]] -> custom tabs
//   filters [{field, label, opts?}] -> dropdowns             period {field, label} -> date dropdown
//   base(row) -> bool (list me kaun si rows aayengi)         headerActions(rows, reload, ui) -> [[label, fn, icon]]
//   detailFields [..] / detailExtra(row) -> side panel       noAdd, noEdit, noDelete, noExport, noDetail, addLabel, pageSize
//   labels, render, csv, actions(row, reload, ui) -> [[label, fn]]
export default function ListPage({ resource, cfg }) {
  const ui = useUI();
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('All');
  const [fv, setFv] = useState({});
  const [period, setPeriod] = useState('All time');
  const [page, setPage] = useState(1);
  const [checked, setChecked] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [editing, setEditing] = useState(undefined); // undefined=band, null=new, row=edit
  const size = cfg.pageSize || 8;
  const load = useCallback(() => api('GET', resource).then(setRows).catch(e => { setRows([]); ui.toast(e.message, 'err'); }), [resource, ui]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); setChecked([]); }, [q, tab, fv, period]);

  const field = k => cfg.fields.find(f => f.name === k);
  const label = k => (cfg.labels && cfg.labels[k]) || (k === 'pending' ? 'Pending' : field(k)?.label || k.replace(/_/g, ' '));
  const isMoney = k => k === 'pending' || field(k)?.type === 'money';

  const base = useMemo(() => (rows || []).filter(r => !cfg.base || cfg.base(r)), [rows, cfg]);
  const tabs = cfg.tabs || (cfg.filter ? [['All', () => true], ...cfg.filter.opts.map(o => [o, r => r[cfg.filter.field] === o])] : null);
  const tabFn = tabs && (tabs.find(t => t[0] === tab) || tabs[0])[1];
  const list = base.filter(r => (!tabFn || tabFn(r))
    && Object.entries(fv).every(([k, v]) => !v || String(r[k] ?? '') === v)
    && (!cfg.period || inPeriod(period, r[cfg.period.field]))
    && JSON.stringify(Object.values(r).filter(v => typeof v !== 'string' || v.length < 500)).toLowerCase().includes(q.toLowerCase()));
  const pages = Math.max(1, Math.ceil(list.length / size));
  const cur = Math.min(page, pages);
  const view = list.slice((cur - 1) * size, cur * size);
  const open = openId && !cfg.noDetail ? base.find(r => r.id === openId) : null;

  const cell = (k, r) => {
    if (cfg.render && cfg.render[k]) return cfg.render[k](r);
    if (k === cfg.primary) return <div className="prim"><b>{r[k] || '—'}</b>{cfg.secondary && <small>{cfg.secondary(r)}</small>}</div>;
    if (cfg.badges?.includes(k)) return r[k] ? <span className={'pill ' + tone(r[k])}>{r[k]}</span> : <span className="muted">—</span>;
    if (isMoney(k)) return inr(k === 'pending' ? r.total - r.paid : r[k]);
    if (field(k)?.type === 'date') {
      const late = LATE_COLS.includes(k) && r[k] && r[k].slice(0, 10) < today() && !CLOSED.includes(r.status || r.stage);
      return <span className={late ? 'late' : ''}>{fmtDate(r[k])}</span>;
    }
    return r[k] === null || r[k] === '' || r[k] === undefined ? <span className="muted">—</span> : (k === 'product' ? <span className="clamp">{r[k]}</span> : r[k]);
  };
  const optsFor = f => f.opts || [...new Set(base.map(r => r[f.field]).filter(Boolean))].sort();
  const remove = async r => {
    if (!(await ui.confirm(`This ${cfg.noun} will be deleted permanently.`))) return;
    try { await api('DELETE', `${resource}/${r.id}`); ui.toast(`${cfg.noun[0].toUpperCase() + cfg.noun.slice(1)} deleted`); setOpenId(null); load(); } catch (e) { ui.toast(e.message, 'err'); }
  };
  const removeChecked = async () => {
    if (!(await ui.confirm(`${checked.length} ${cfg.noun}(s) will be deleted permanently.`))) return;
    try { for (const id of checked) await api('DELETE', `${resource}/${id}`); ui.toast('Deleted'); setChecked([]); load(); } catch (e) { ui.toast(e.message, 'err'); load(); }
  };
  const exportCsv = () => csvDownload(cfg.title.toLowerCase().replace(/\s+/g, '-'), cfg.cols.map(label),
    list.map(r => cfg.cols.map(k => (k === 'pending' ? r.total - r.paid : cfg.csv && cfg.csv[k] ? cfg.csv[k](r) : r[k]))));
  const acts = r => (cfg.actions ? cfg.actions(r, load, ui) : []);
  const startAdd = () => (cfg.onAdd ? cfg.onAdd() : setEditing(null));
  const startEdit = r => (cfg.onEdit ? cfg.onEdit(r) : setEditing(r));
  const allOn = view.length > 0 && view.every(r => checked.includes(r.id));
  const activeTab = tabs && (tabs.find(t => t[0] === tab) || tabs[0])[0];

  const detail = open && (
    <aside className="dpanel">
      <header><h3>{cfg.noun[0].toUpperCase() + cfg.noun.slice(1)} details</h3><button className="btn icon" aria-label="Close" onClick={() => setOpenId(null)}><Icon name="x" /></button></header>
      <div className="dbody">
        {cfg.detailTop && cfg.detailTop(open)}
        <h2>{open[cfg.primary] || '—'}</h2>
        {cfg.secondary && <p className="muted">{cfg.secondary(open)}</p>}
        {cfg.badges && <div className="row-gap" style={{ margin: '8px 0 12px' }}>{cfg.badges.filter(b => open[b]).map(b => <span key={b} className={'pill ' + tone(open[b])}>{open[b]}</span>)}</div>}
        {(cfg.detailFields || cfg.fields.map(f => f.name)).filter(k => k !== cfg.primary && !cfg.badges?.includes(k)).map(k => (
          <div className="kv" key={k}><span>{label(k)}</span><div>{cell(k, open)}</div></div>))}
        {cfg.detailExtra && cfg.detailExtra(open)}
      </div>
      <footer>
        {acts(open).map(([l, fn]) => <button key={l} className={'btn ' + (l === 'WhatsApp' ? 'wa' : 'tint')} onClick={fn}><Icon name={ACT_ICON[l] || 'arrow'} />{l}</button>)}
        {!cfg.noEdit && <button className="btn" onClick={() => startEdit(open)}><Icon name="edit" />Edit</button>}
        {!cfg.noDelete && <button className="btn icon del" aria-label="Delete" onClick={() => remove(open)}><Icon name="trash" /></button>}
      </footer>
    </aside>);

  return (
    <>
      <PageHead title={cfg.title} desc={cfg.desc}>
        <div className="row-gap">
          {(cfg.headerActions ? cfg.headerActions(rows || [], load, ui) : []).map(([l, fn, ic]) => <button key={l} className="btn" onClick={fn}><Icon name={ic || 'arrow'} />{l}</button>)}
          {!cfg.noExport && rows && rows.length > 0 && <button className="btn" onClick={exportCsv}><Icon name="download" />Export</button>}
          {!cfg.noAdd && <button className="btn primary" onClick={() => startAdd()}><Icon name="plus" />{cfg.addLabel || `Add ${cfg.noun}`}</button>}
        </div>
      </PageHead>
      {cfg.cards && rows && <StatCards items={cfg.cards(rows)} />}
      {cfg.top && rows && cfg.top(rows, load, ui)}
      {cfg.summary && rows && <StatStrip items={cfg.summary(rows)} />}

      <div className="tools">
        <div className="search"><Icon name="search" /><input aria-label="Search" placeholder={`Search ${cfg.title.toLowerCase()}…`} value={q} onChange={e => setQ(e.target.value)} /></div>
        {(cfg.filters || []).map(f => (
          <select key={f.field} className="sel" aria-label={f.label} value={fv[f.field] || ''} onChange={e => setFv({ ...fv, [f.field]: e.target.value })}>
            <option value="">{f.label}: All</option>{optsFor(f).map(o => <option key={o} value={o}>{o}</option>)}
          </select>))}
        {cfg.period && <select className="sel" aria-label="Date" value={period} onChange={e => setPeriod(e.target.value)}>{PERIODS.map(p => <option key={p}>{p}</option>)}</select>}
        {(Object.values(fv).some(Boolean) || period !== 'All time' || q) && <button className="btn sm" onClick={() => { setFv({}); setPeriod('All time'); setQ(''); }}>Clear</button>}
      </div>
      {tabs && <div className="tabs">{tabs.map(([t, fn]) => (
        <button key={t} className={'tab ' + (activeTab === t ? 'on' : '')} onClick={() => setTab(t)}>{t} <small>({base.filter(fn).length})</small></button>))}</div>}

      {checked.length > 0 && !cfg.noDelete && (
        <div className="bulk"><b>{checked.length} selected</b>
          <button className="btn sm danger" onClick={removeChecked}><Icon name="trash" />Delete selected</button>
          <button className="btn sm" onClick={() => setChecked([])}>Clear</button></div>)}

      <div className={'split ' + (open ? 'has ' : '') + (cfg.panelWide ? 'wide' : '')}>
        <div>
          <div className="panel">
            {rows === null ? (
              <div style={{ padding: 20, display: 'grid', gap: 16 }}>{[1, 2, 3, 4].map(i => <div className="sk" key={i} />)}</div>
            ) : list.length === 0 ? (
              <div className="empty"><Icon name="inbox" />
                <h3>{base.length ? 'No matches' : `No ${cfg.title.toLowerCase()} yet`}</h3>
                <p>{base.length ? 'Try a different search or filter.' : cfg.noAdd ? 'They will show up here automatically.' : `Add your first ${cfg.noun} to get started.`}</p>
                {!base.length && !cfg.noAdd && <button className="btn primary" onClick={() => startAdd()}><Icon name="plus" />{cfg.addLabel || `Add ${cfg.noun}`}</button>}
              </div>
            ) : (
              <div className="scroll"><table>
                <thead><tr>
                  {!cfg.noDelete && <th className="chk"><input type="checkbox" aria-label="Select all" checked={allOn} onChange={e => setChecked(e.target.checked ? [...new Set([...checked, ...view.map(r => r.id)])] : checked.filter(id => !view.some(r => r.id === id)))} /></th>}
                  {cfg.cols.map(k => <th key={k} className={(isMoney(k) ? 'num ' : '') + 'c-' + k}>{label(k)}</th>)}<th className="act-cell">Actions</th></tr></thead>
                <tbody>{view.map(r => (
                  <tr key={r.id} className={open && open.id === r.id ? 'sel' : ''}>
                    {!cfg.noDelete && <td className="chk"><input type="checkbox" aria-label="Select row" checked={checked.includes(r.id)} onChange={e => setChecked(e.target.checked ? [...checked, r.id] : checked.filter(id => id !== r.id))} /></td>}
                    {cfg.cols.map(k => <td key={k} className={(isMoney(k) ? 'num ' : '') + 'c-' + k}>{cell(k, r)}</td>)}
                    <td className="act-cell"><div className="acts">
                      {!cfg.noDetail && <button className="btn icon" title="View" aria-label="View" onClick={() => setOpenId(r.id)}><Icon name="eye" /></button>}
                      {acts(r).map(([l, fn]) => <button key={l} className={'btn icon ' + (l === 'WhatsApp' ? 'wa-i' : '')} title={l} aria-label={l} onClick={fn}><Icon name={ACT_ICON[l] || 'arrow'} /></button>)}
                      {!cfg.noEdit && <button className="btn icon" title="Edit" aria-label="Edit" onClick={() => startEdit(r)}><Icon name="edit" /></button>}
                      {!cfg.noDelete && <button className="btn icon del" title="Delete" aria-label="Delete" onClick={() => remove(r)}><Icon name="trash" /></button>}
                    </div></td>
                  </tr>))}</tbody>
              </table></div>)}
          </div>
          {list.length > 0 && (
            <div className="pager">
              <span className="muted">Showing {(cur - 1) * size + 1}–{Math.min(cur * size, list.length)} of {list.length} {cfg.title.toLowerCase()}</span>
              {pages > 1 && <div className="pg">
                <button disabled={cur === 1} onClick={() => setPage(1)} aria-label="First page">«</button>
                <button disabled={cur === 1} onClick={() => setPage(cur - 1)} aria-label="Previous page">‹</button>
                {Array.from({ length: pages }, (_, i) => i + 1).filter(p => p === 1 || p === pages || Math.abs(p - cur) <= 1).map((p, i, a) => (
                  <span key={p}>{i > 0 && p - a[i - 1] > 1 && <em>…</em>}<button className={p === cur ? 'on' : ''} onClick={() => setPage(p)}>{p}</button></span>))}
                <button disabled={cur === pages} onClick={() => setPage(cur + 1)} aria-label="Next page">›</button>
                <button disabled={cur === pages} onClick={() => setPage(pages)} aria-label="Last page">»</button>
              </div>}
            </div>)}
        </div>
        {detail}
      </div>
      {editing !== undefined && <FormDrawer resource={resource} cfg={cfg} row={editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); load(); }} />}
    </>
  );
}