import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { daysFrom, fmtDate, greeting, tone } from '../../utils';
import AttendanceCard from '../../components/AttendanceCard';
import { useAuth } from '../../components/AuthContext';
import FollowRow from '../../components/FollowRow';
import PageHead from '../../components/PageHead';
import StatStrip from '../../components/StatStrip';
import { taskDue, useTaskOps } from '../../components/TaskCard';
import TodoRow from '../../components/TodoRow';
import { useUI } from '../../components/UI';

export default function Dashboard() {
  const ui = useUI();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const load = useCallback(async () => {
    const [s, t, c, a, n] = await Promise.all([api('GET', 'my/dashboard'), api('GET', 'my/tasks'), api('GET', 'my/customers'), api('GET', 'my/attendance'), api('GET', 'my/announcements')]);
    setData({ s, t, c, a, n });
  }, []);
  useEffect(() => { load().catch(e => ui.toast(e.message, 'err')); }, [load, ui]);
  const ops = useTaskOps(load);
  if (!data) return <div style={{ display: 'grid', gap: 16 }}>{[1, 2, 3].map(i => <div className="sk" style={{ height: 60 }} key={i} />)}</div>;

  const { s, t, c, a, n } = data;
  const pending = t.filter(x => x.status !== 'Done').slice(0, 6);
  const fu = c.filter(x => x.followup_date && daysFrom(x.followup_date) <= 0 && !['Customer', 'Lost'].includes(x.stage)).sort((x, y) => x.followup_date.localeCompare(y.followup_date));
  const first = String((user && user.name) || '').split(' ')[0];
  const todo = s.overdue + s.dueToday + fu.length;

  return (
    <>
      <PageHead title={`${greeting()}${first ? ', ' + first : ''}`}
        desc={`${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}. ${todo ? `${todo} thing${todo > 1 ? 's' : ''} need${todo > 1 ? '' : 's'} your attention today.` : 'Nothing urgent today.'}`} />
      <StatStrip items={[['Open tasks', s.openTasks, true], ['Due today', s.dueToday, true], ['Overdue', s.overdue, true], ['Done this month', s.doneMonth, true],
        ...(user && user.department === 'Sales Team' ? [['My open leads', s.myLeads, true], ['Follow-ups due', s.followups, true]] : [])]} />
      <div className="dash">
        <div>
          <div className="sect"><h3>My tasks <em>{s.openTasks}</em><Link className="more" to="tasks">See all</Link></h3>
            {pending.length === 0 ? <div className="panel allgood"><h3>No pending tasks</h3><p className="muted">New tasks from your admin will show up here.</p></div> : (
              <div className="panel">{pending.map(x => {
                const due = taskDue(x);
                return <TodoRow key={x.id} title={x.title} tag={x.priority} tagTone={tone(x.priority)}
                  sub={<><span className={due.late ? 'late' : ''}>{due.text}</span>{x.description ? ' — ' + x.description : ''}</>}
                  actions={[...(x.status === 'Open' ? [{ label: 'Start', kind: 'tint', onClick: () => ops.start(x) }] : [{ label: 'Add note', kind: '', onClick: () => ops.note(x) }]),
                    { label: 'Mark done', kind: 'wa', onClick: () => ops.done(x) }]} />;
              })}</div>)}
          </div>
          {fu.length > 0 && <div className="sect"><h3>Follow-ups due <em>{fu.length}</em><Link className="more" to="followups">See all</Link></h3>
            <div className="panel">{fu.slice(0, 5).map(x => <FollowRow key={x.id} c={x} base="my/customers" onDone={load} />)}</div></div>}
        </div>
        <div className="dash-side">
          <AttendanceCard today={a.today} reload={load} />
          <div className="card"><h3>Notices from admin</h3>
            {n.length === 0 ? <p className="muted">No notices right now.</p> : n.slice(0, 4).map(x => (
              <div className="note" key={x.id}><b>{x.title}</b><small>{fmtDate(x.posted_on)}</small><p>{x.message}</p></div>))}</div>
        </div>
      </div>
    </>
  );
}