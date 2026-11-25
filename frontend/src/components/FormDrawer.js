import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import Icon from './Icon';
import ImagePick from './ImagePick';
import { useUI } from './UI';

// Add / Edit ka side drawer (cfg.fields ke hisab se)
// field.type: text | textarea | number | money | date | month | time | select | ref | image
//   ref: { type:'ref', src:'employees', valKey:'id' } -> dropdown server se, valKey wali value save hoti hai (default: name)
//   image: { type:'image', round:true, maxPx:400 }  lazy:true = edit par alag se load hota hai (`${resource}/${id}/documents`)
//   section: 'Bank details' -> is field se pehle heading
export default function FormDrawer({ resource, cfg, row, onClose, onSaved }) {
  const ui = useUI();
  const [refs, setRefs] = useState({});
  const [errs, setErrs] = useState({});
  const [saving, setSaving] = useState(false);
  const lazy = cfg.fields.filter(f => f.lazy);
  const [loaded, setLoaded] = useState(() => (row ? [] : lazy.map(f => f.name)));
  const [vals, setVals] = useState(() => Object.fromEntries(cfg.fields.map(f => [f.name, row ? row[f.name] ?? '' : f.def ? f.def() : ''])));
  const closeRef = useRef(onClose); closeRef.current = onClose;

  useEffect(() => {
    cfg.fields.filter(f => f.type === 'ref').forEach(f =>
      api('GET', f.src).then(list => setRefs(r => ({ ...r, [f.name]: list.map(x => ({ v: x[f.valKey || 'name'], l: (x.name || x.business) + (x.status === 'Inactive' ? ' (inactive)' : '') })) }))).catch(() => {}));
    if (row && lazy.length) api('GET', `${resource}/${row.id}/documents`).then(d => { setVals(v => ({ ...v, ...Object.fromEntries(lazy.map(f => [f.name, d[f.name] || ''])) })); setLoaded(lazy.map(f => f.name)); }).catch(() => {});
    const k = e => e.key === 'Escape' && closeRef.current();
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
    // eslint-disable-next-line
  }, []);

  const set = (k, v) => { setVals(s => ({ ...s, [k]: v })); setErrs(e => ({ ...e, [k]: '' })); };
  const save = async () => {
    const req = cfg.required || [cfg.fields[0].name];
    const e = {}; req.forEach(k => { if (!String(vals[k] ?? '').trim()) e[k] = `${cfg.fields.find(f => f.name === k).label} is required`; });
    if (Object.keys(e).length) return setErrs(e);
    const body = { ...vals };
    lazy.forEach(f => { if (!loaded.includes(f.name)) delete body[f.name]; }); // load nahi hui scan ko khali na kar do
    setSaving(true);
    try { row ? await api('PUT', `${resource}/${row.id}`, body) : await api('POST', resource, body); ui.toast(`${cfg.noun[0].toUpperCase() + cfg.noun.slice(1)} saved`); onSaved(); }
    catch (er) { ui.toast(er.message, 'err'); setSaving(false); }
  };

  return (
    <div className="backdrop" onClick={onClose}>
      <aside className={'drawer ' + (cfg.drawerWide ? 'wide' : '')} role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <header><h2>{row ? 'Edit' : 'New'} {cfg.noun}</h2><button className="btn icon" aria-label="Close" onClick={onClose}><Icon name="x" /></button></header>
        <div className="body">
          <div className="fg">
            {cfg.fields.map((f, i) => {
              const opts = f.type === 'select' ? f.opts.map(o => ({ v: o, l: o })) : refs[f.name] || [];
              const wide = f.type === 'textarea' || f.type === 'image' || f.full;
              return (
                <div key={f.name} style={{ display: 'contents' }}>
                  {f.section && <h3 className="fsec w">{f.section}</h3>}
                  <div className={(wide ? 'w ' : '') + (errs[f.name] ? 'e' : '')}>
                    <label htmlFor={'f_' + f.name}>{f.label}</label>
                    {f.type === 'select' || f.type === 'ref' ? (
                      <select id={'f_' + f.name} value={vals[f.name]} onChange={e => set(f.name, e.target.value)}>
                        <option value="">Select…</option>{opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                      </select>
                    ) : f.type === 'textarea' ? (
                      <textarea id={'f_' + f.name} rows={3} value={vals[f.name]} onChange={e => set(f.name, e.target.value)} />
                    ) : f.type === 'image' ? (
                      <ImagePick id={'f_' + f.name} value={vals[f.name]} round={f.round} maxPx={f.maxPx || 400} quality={f.quality || 0.82} label={f.pick || 'Choose file'}
                        onChange={v => set(f.name, v)} />
                    ) : (
                      <input id={'f_' + f.name} autoFocus={i === 0} type={['money', 'number'].includes(f.type) ? 'number' : ['date', 'month', 'time'].includes(f.type) ? f.type : 'text'} step="any"
                        value={vals[f.name]} onChange={e => set(f.name, e.target.value)} />
                    )}
                    {f.hint && <div className="hint">{f.hint}</div>}
                    {errs[f.name] && <div className="em">{errs[f.name]}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <footer><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save ' + cfg.noun}</button></footer>
      </aside>
    </div>
  );
}
