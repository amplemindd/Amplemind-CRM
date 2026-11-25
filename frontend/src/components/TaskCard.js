import { useState } from 'react';
import { api } from '../api';
import TaskChat from './TaskChat';
import { daysFrom, dueLabel, fmtDate, tone } from '../utils';
import { useUI } from './UI';

// Task ke buttons (Start / Done / Note / Reopen). Dashboard aur My tasks dono yahi use karte hain.
export function useTaskOps(reload) {
  const ui = useUI();
  const put = async (t, body, msg) => { try { await api('PUT', 'my/tasks/' + t.id, body); ui.toast(msg); reload(); } catch (e) { ui.toast(e.message, 'err'); } };
  return {
    start: t => put(t, { status: 'In Progress' }, 'Task started'),
    reopen: t => put(t, { status: 'Open' }, 'Task reopened'),
    done: async t => {
      const v = await ui.ask('Mark task as done', [{ name: 'remark', label: 'Note for admin (optional)', def: t.remark || '', placeholder: 'e.g. Client agreed, payment next week' }], 'Mark done');
      if (v) put(t, { status: 'Done', remark: v.remark }, 'Great job! Task marked done');
    },
    note: async t => {
      const v = await ui.ask('Add a note', [{ name: 'remark', label: 'Note for admin', def: t.remark || '', required: true }], 'Save note');
      if (v) put(t, { remark: v.remark }, 'Note saved');
    },
  };
}

export const taskDue = t => {
  if (t.status === 'Done') return { text: t.completed_at ? `Completed ${fmtDate(t.completed_at)}` : 'Completed', late: false };
  if (!t.deadline) return { text: 'No deadline', late: false };
  const d = daysFrom(t.deadline);
  return { text: `${dueLabel(d)} · ${fmtDate(t.deadline)}`, late: d < 0 };
};

export default function TaskCard({ t, ops }) {
  const due = taskDue(t);
  const [chat, setChat] = useState(false);
  return (
    <div className={'tk pr-' + String(t.priority || 'Medium').toLowerCase()}>
      <div className="tk-main">
        <div className="tags"><b>{t.title}</b><span className={'pill ' + tone(t.priority)}>{t.priority || 'Medium'}</span><span className={'pill ' + tone(t.status)}>{t.status}</span></div>
        {t.description && <p className="tk-desc">{t.description}</p>}
        <div className="tk-meta"><span className={due.late ? 'late' : ''}>{due.text}</span><span>Assigned {fmtDate(t.created_at)}</span></div>
        {t.remark && <div className="tk-note"><b>Your note:</b> {t.remark}</div>}
      </div>
      <div className="btns">
        {t.status === 'Open' && <button className="btn sm tint" onClick={() => ops.start(t)}>Start</button>}
        {t.status !== 'Done' && <button className="btn sm wa" onClick={() => ops.done(t)}>Mark done</button>}
        {t.status === 'Done' && <button className="btn sm" onClick={() => ops.reopen(t)}>Reopen</button>}
        <button className="btn sm" onClick={() => ops.note(t)}>{t.remark ? 'Edit note' : 'Add note'}</button>
        <button className={'btn sm ' + (chat ? 'primary' : '')} onClick={() => setChat(c => !c)}>{chat ? 'Hide chat' : 'Chat'}</button>
      </div>
      {chat && <div className="tk-chat"><TaskChat taskId={t.id} who="employee" /></div>}
    </div>
  );
}
