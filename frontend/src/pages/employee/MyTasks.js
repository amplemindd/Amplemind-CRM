import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';
import { today } from '../../utils';
import Icon from '../../components/Icon';
import PageHead from '../../components/PageHead';
import StatStrip from '../../components/StatStrip';
import TaskCard, { useTaskOps } from '../../components/TaskCard';
import { useUI } from '../../components/UI';

const CHIPS = ['Pending', 'Done', 'All'];

export default function MyTasks() {
  const ui = useUI();
  const [rows, setRows] = useState(null);
  const [chip, setChip] = useState('Pending');
  const load = useCallback(() => api('GET', 'my/tasks').then(setRows), []);
  useEffect(() => { load().catch(e => ui.toast(e.message, 'err')); }, [load, ui]);
  const ops = useTaskOps(load);

  const pick = r => (chip === 'All' ? true : chip === 'Done' ? r.status === 'Done' : r.status !== 'Done');
  const list = (rows || []).filter(pick);
  const count = c => (rows || []).filter(r => (c === 'All' ? true : c === 'Done' ? r.status === 'Done' : r.status !== 'Done')).length;
  return (
    <>
      <PageHead title="My tasks" desc="Tasks your admin has assigned to you. Only you can see these." />
      {rows && <StatStrip items={[['Open', rows.filter(r => r.status === 'Open').length, true], ['In progress', rows.filter(r => r.status === 'In Progress').length, true],
        ['Overdue', rows.filter(r => r.status !== 'Done' && r.deadline && r.deadline < today()).length, true], ['Completed', rows.filter(r => r.status === 'Done').length, true]]} />}
      <div className="tools"><div className="chips">{CHIPS.map(c => <button key={c} className={'chip ' + (chip === c ? 'on' : '')} onClick={() => setChip(c)}>{c}<small>{count(c)}</small></button>)}</div></div>
      {rows === null ? <div style={{ display: 'grid', gap: 12 }}>{[1, 2, 3].map(i => <div className="sk" style={{ height: 80 }} key={i} />)}</div>
        : list.length === 0 ? <div className="panel empty"><Icon name="tasks" /><h3>{chip === 'Done' ? 'Nothing completed yet' : 'No pending tasks'}</h3><p>{chip === 'Done' ? 'Finished tasks will be listed here.' : 'New tasks from your admin will show up here.'}</p></div>
        : <div className="tklist">{list.map(t => <TaskCard key={t.id} t={t} ops={ops} />)}</div>}
    </>
  );
}
