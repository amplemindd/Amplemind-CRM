import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';
import Chat from '../../components/Chat';
import Icon from '../../components/Icon';
import PageHead from '../../components/PageHead';
import { timeAgo } from '../../utils';

// Admin ki inbox: har employee ke saath seedhi chat (query, sawal-jawab)
export default function Messages() {
  const [threads, setThreads] = useState(null);
  const [sel, setSel] = useState(null);
  const [q, setQ] = useState('');
  const load = useCallback(() => api('GET', 'messages/threads').then(setThreads).catch(() => setThreads([])), []);
  useEffect(() => { load(); const t = setInterval(() => !document.hidden && load(), 8000); return () => clearInterval(t); }, [load]);

  const list = (threads || []).filter(t => (t.name + ' ' + (t.department || '')).toLowerCase().includes(q.toLowerCase()));
  const cur = (threads || []).find(t => t.id === sel);

  return (
    <>
      <PageHead title="Messages" desc="Talk to your team and answer their queries. Task related chats are inside each task." />
      <div className={'msgs ' + (cur ? 'open' : '')}>
        <div className="mlist panel">
          <div className="search" style={{ margin: 12 }}><Icon name="search" /><input aria-label="Search employee" placeholder="Search employee…" value={q} onChange={e => setQ(e.target.value)} /></div>
          {threads === null ? <div style={{ padding: 16 }}><div className="sk" /></div> : list.length === 0 ? <p className="muted" style={{ padding: 16 }}>No employees found.</p> : list.map(t => (
            <button key={t.id} className={'mrow ' + (sel === t.id ? 'on' : '')} onClick={() => { setSel(t.id); load(); }}>
              <div className="mtxt"><b>{t.name}</b><small>{t.department || t.role || 'Employee'}</small>
                <span className="muted">{t.last_body ? t.last_body.slice(0, 48) : 'No messages yet'}</span></div>
              <div className="mmeta">{t.last_at && <small>{timeAgo(t.last_at)}</small>}
                {t.unread > 0 && <span className="cnt">{t.unread}</span>}
                {t.unread === 0 && t.task_unread > 0 && <small className="muted">{t.task_unread} in tasks</small>}</div>
            </button>))}
        </div>
        <div className="mchat panel">
          {cur ? (
            <>
              <div className="mhead"><button className="btn icon mback" aria-label="Back to list" onClick={() => setSel(null)}><Icon name="back" /></button>
                <div><b>{cur.name}</b><small>{cur.department || cur.role || 'Employee'}</small></div></div>
              <Chat key={cur.id} me="admin" height={420} placeholder={`Message ${cur.name.split(' ')[0]}`}
                load={() => api('GET', `messages?employee_id=${cur.id}`).then(r => { load(); return r; })} send={body => api('POST', 'messages', { employee_id: cur.id, body })} />
            </>
          ) : <div className="empty"><Icon name="chat" /><h3>Select an employee</h3><p>Choose someone from the list to start chatting.</p></div>}
        </div>
      </div>
    </>
  );
}
