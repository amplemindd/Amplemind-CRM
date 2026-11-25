import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { timeAgo } from '../utils';
import Chat from './Chat';
import Icon from './Icon';
import { PhoneIcon, useLive, VideoIcon } from './LiveProvider';

const ICON = { image: '📷', audio: '🎤', file: '📎' }, LABEL = { image: 'Photo', audio: 'Voice message', file: 'Document' };
const preview = t => (!t.last_attach && !t.last_body ? 'No messages yet'
  : (t.last_attach ? ICON[t.last_attach] + ' ' : '') + (t.last_body ? t.last_body.slice(0, 44) : LABEL[t.last_attach]));

// Page ke neeche-right corner ka Messages button. Dabane par WhatsApp jaisa chat khulta hai.
// who = 'admin' (employees ki list + chat) ya 'employee' (admin se seedhi chat). count = unread messages
export default function MessageFab({ who, count = 0 }) {
  const admin = who === 'admin';
  const { startCall, inCall } = useLive();
  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState(null);
  const [sel, setSel] = useState(null);
  const [q, setQ] = useState('');

  const loadThreads = useCallback(() => api('GET', 'messages/threads').then(setThreads).catch(() => setThreads([])), []);
  useEffect(() => { // admin ki employee list (panel khula ho tab hi refresh)
    if (!open || !admin) return undefined;
    loadThreads();
    const t = setInterval(() => !document.hidden && loadThreads(), 8000);
    return () => clearInterval(t);
  }, [open, admin, loadThreads]);
  useEffect(() => { // Esc se band (camera / photo khula ho to unka Esc pehle)
    if (!open) return undefined;
    const k = e => { if (e.key === 'Escape' && !document.querySelector('.wa-cam,.lightbox')) setOpen(false); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [open]);

  const list = (threads || []).filter(t => (t.name + ' ' + (t.department || '')).toLowerCase().includes(q.toLowerCase()));
  const cur = admin && sel ? (threads || []).find(t => t.id === sel) : null;
  const close = () => { setOpen(false); setSel(null); };

  return (
    <>
      <button type="button" className="fab" aria-label={open ? 'Close messages' : 'Open messages'} aria-expanded={open} onClick={() => (open ? close() : setOpen(true))}>
        <Icon name={open ? 'x' : 'chat'} />
        {!open && count > 0 && <span className="cnt">{count > 99 ? '99+' : count}</span>}
      </button>

      {open && (
        <div className="wapanel" role="dialog" aria-label="Messages">
          {!admin ? (
            <>
              <div className="wahead"><span className="av">A</span><div className="wt"><b>Admin</b><small>Ask anything or share an update</small></div>
                <button type="button" className="btn icon callbtn" aria-label="Call admin" title="Voice call" disabled={inCall} onClick={() => startCall({ name: 'Admin' })}><PhoneIcon /></button>
                <button type="button" className="btn icon callbtn" aria-label="Video call admin" title="Video call" disabled={inCall} onClick={() => startCall({ name: 'Admin', video: true })}><VideoIcon /></button>
                <button type="button" className="btn icon" aria-label="Close" onClick={close}><Icon name="x" /></button></div>
              <Chat me="employee" fill attach placeholder="Message"
                load={() => api('GET', 'my/messages')} send={(body, x) => api('POST', 'my/messages', { body, ...x })} empty="No messages yet. Write to your admin here." />
            </>
          ) : cur ? (
            <>
              <div className="wahead">
                <button type="button" className="btn icon" aria-label="Back to list" onClick={() => setSel(null)}><Icon name="back" /></button>
                <span className="av">{cur.name[0].toUpperCase()}</span>
                <div className="wt"><b>{cur.name}</b><small>{cur.department || cur.role || 'Employee'}</small></div>
                <button type="button" className="btn icon callbtn" aria-label={`Call ${cur.name}`} title="Voice call" disabled={inCall} onClick={() => startCall({ employee_id: cur.id, name: cur.name })}><PhoneIcon /></button>
                <button type="button" className="btn icon callbtn" aria-label={`Video call ${cur.name}`} title="Video call" disabled={inCall} onClick={() => startCall({ employee_id: cur.id, name: cur.name, video: true })}><VideoIcon /></button>
                <button type="button" className="btn icon" aria-label="Close" onClick={close}><Icon name="x" /></button>
              </div>
              <Chat key={cur.id} me="admin" fill attach placeholder={`Message ${cur.name.split(' ')[0]}`}
                load={() => api('GET', `messages?employee_id=${cur.id}`).then(r => { loadThreads(); return r; })}
                send={(body, x) => api('POST', 'messages', { employee_id: cur.id, body, ...x })} />
            </>
          ) : (
            <>
              <div className="wahead"><div className="wt"><b>Messages</b><small>Chat with your team</small></div>
                <button type="button" className="btn icon" aria-label="Close" onClick={close}><Icon name="x" /></button></div>
              <div className="walist">
                <div className="search"><Icon name="search" /><input aria-label="Search employee" placeholder="Search employee…" value={q} onChange={e => setQ(e.target.value)} /></div>
                {threads === null ? <div style={{ padding: 16 }}><div className="sk" /></div> : list.length === 0 ? <p className="muted" style={{ padding: 16 }}>No employees found.</p> : list.map(t => (
                  <button type="button" key={t.id} className="mrow" onClick={() => { setSel(t.id); loadThreads(); }}>
                    <div className="row"><span className="av">{t.name[0].toUpperCase()}</span>
                      <div className="mtxt"><b>{t.name}</b><small>{t.department || t.role || 'Employee'}</small><span className="muted">{preview(t)}</span></div></div>
                    <div className="mmeta">{t.last_at && <small>{timeAgo(t.last_at)}</small>}
                      {t.unread > 0 && <span className="cnt">{t.unread}</span>}
                      {t.unread === 0 && t.task_unread > 0 && <small className="muted">{t.task_unread} in tasks</small>}</div>
                  </button>))}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}