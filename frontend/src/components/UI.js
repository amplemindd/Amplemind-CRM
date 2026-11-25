import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Icon from './Icon';

// Toast + Confirm + Ask (chhota form popup) + Notice (jaankari popup): alert/confirm/prompt ki jagah
const Ctx = createContext(null);
export const useUI = () => useContext(Ctx);

function AskBox({ dlg, close }) {
  const [v, setV] = useState(() => Object.fromEntries(dlg.fields.map(f => [f.name, f.def ?? ''])));
  const [err, setErr] = useState('');
  const submit = () => {
    const miss = dlg.fields.find(f => f.required && !String(v[f.name]).trim());
    if (miss) return setErr(`${miss.label} is required`);
    close(v);
  };
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={dlg.title} onClick={e => e.stopPropagation()}>
      <header><h2>{dlg.title}</h2></header>
      <div className="body fg" style={{ gridTemplateColumns: '1fr' }}>
        {dlg.fields.map((f, i) => (
          <div key={f.name}>
            <label htmlFor={'ask_' + f.name}>{f.label}</label>
            {f.opts ? <select id={'ask_' + f.name} value={v[f.name]} onChange={e => setV({ ...v, [f.name]: e.target.value })}>{f.opts.map(o => <option key={o}>{o}</option>)}</select>
              : <input id={'ask_' + f.name} autoFocus={i === 0} type={f.type || 'text'} placeholder={f.placeholder} value={v[f.name]} onChange={e => setV({ ...v, [f.name]: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && submit()} />}
            {f.hint && <div className="hint">{f.hint}</div>}
          </div>
        ))}
        {err && <div className="em" style={{ color: 'var(--red)' }}>{err}</div>}
      </div>
      <footer><button className="btn" onClick={() => close(null)}>Cancel</button><button className="btn primary" onClick={submit}>{dlg.okLabel}</button></footer>
    </div>
  );
}

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dlg, setDlg] = useState(null);
  const toast = useCallback((msg, type = 'ok') => {
    const id = Math.random();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  const confirm = useCallback((message, okLabel = 'Delete') => new Promise(res => setDlg({ type: 'confirm', message, okLabel, res })), []);
  const ask = useCallback((title, fields, okLabel = 'Save') => new Promise(res => setDlg({ type: 'ask', title, fields, okLabel, res })), []);
  // notice(title, text, [{label, onClick(text)}]) - text ko pre-formatted dikhata hai (login details copy/share ke liye)
  const notice = useCallback((title, text, buttons = []) => new Promise(res => setDlg({ type: 'notice', title, text, buttons, res })), []);
  const ui = useMemo(() => ({ toast, confirm, ask, notice }), [toast, confirm, ask, notice]);
  const close = v => { dlg.res(v); setDlg(null); };

  useEffect(() => {
    if (!dlg) return;
    const k = e => e.key === 'Escape' && close(dlg.type === 'confirm' ? false : null);
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  });

  return (
    <Ctx.Provider value={ui}>
      {children}
      <div className="toasts" role="status" aria-live="polite">{toasts.map(t => <div key={t.id} className={'toast ' + (t.type === 'err' ? 'err' : '')}>{t.msg}</div>)}</div>
      {dlg && (
        <div className="backdrop center" onClick={() => dlg.type !== 'notice' && close(dlg.type === 'confirm' ? false : null)}>
          {dlg.type === 'ask' ? <AskBox dlg={dlg} close={close} /> : dlg.type === 'notice' ? (
            <div className="modal" role="dialog" aria-modal="true" aria-label={dlg.title} onClick={e => e.stopPropagation()}>
              <header><h2>{dlg.title}</h2></header>
              <div className="body"><pre className="creds">{dlg.text}</pre></div>
              <footer>{dlg.buttons.map(b => <button key={b.label} className="btn" onClick={() => b.onClick(dlg.text)}>{b.label}</button>)}
                <button className="btn primary" autoFocus onClick={() => close(true)}>Done</button></footer>
            </div>
          ) : (
            <div className="modal" role="alertdialog" aria-modal="true" onClick={e => e.stopPropagation()}>
              <div className="body"><h2 style={{ fontSize: 17, marginBottom: 6 }}>Are you sure?</h2><p>{dlg.message}</p></div>
              <footer><button className="btn" autoFocus onClick={() => close(false)}>Cancel</button><button className="btn danger" onClick={() => close(true)}>{dlg.okLabel}</button></footer>
            </div>
          )}
        </div>
      )}
    </Ctx.Provider>
  );
}
export { Icon };
