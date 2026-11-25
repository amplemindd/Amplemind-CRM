import { useEffect } from 'react';
import ListPage from '../../components/ListPage';
import TaskChat from '../../components/TaskChat';
import { api } from '../../api';
import { F, fmtDate, fmtDateTime, today } from '../../utils';
import { PRIORITIES, TASK_STATUS } from '../../config';

const late = r => r.status !== 'Done' && r.deadline && r.deadline.slice(0, 10) < today();

const config = {
  noun: 'task', primary: 'title', badges: ['priority', 'status'], required: ['title', 'employee_id'], panelWide: true,
  secondary: r => r.employee || 'Not assigned',
  title: 'Tasks', desc: 'Assign work to one employee. Only that employee sees it on their login. Use the chat to talk about the task.', addLabel: 'New task',
  tabs: [['All', () => true], ...TASK_STATUS.map(s => [s, r => r.status === s]), ['Overdue', late]],
  filters: [{ field: 'employee', label: 'Employee' }, { field: 'priority', label: 'Priority', opts: PRIORITIES }],
  cards: rows => [
    ['Open', rows.filter(r => r.status === 'Open').length, true, 'tasks', 'blue'],
    ['In progress', rows.filter(r => r.status === 'In Progress').length, true, 'clock', 'amber'],
    ['Overdue', rows.filter(late).length, true, 'bell', 'red'],
    ['Completed', rows.filter(r => r.status === 'Done').length, true, 'check', 'green'],
  ],
  labels: { employee: 'Assigned to', employee_id: 'Assign to', deadline_time: 'Time', related: 'Related customer / lead', completed_at: 'Completed on', remark: 'Employee note' },
  fields: [F('title', 'Task'), F('employee_id', 'Assign to', 'ref', { src: 'employees', valKey: 'id' }), F('description', 'Details (optional)', 'textarea'),
    F('priority', 'Priority', 'select', { opts: PRIORITIES, def: () => 'Medium' }), F('deadline', 'Deadline date', 'date'), F('deadline_time', 'Time (optional)', 'time'),
    F('related', 'Related customer or lead (optional)', 'ref', { src: 'customers', valKey: 'business' }),
    F('status', 'Status', 'select', { opts: TASK_STATUS, def: () => 'Open' })],
  cols: ['title', 'employee', 'priority', 'deadline', 'status'],
  render: {
    employee: r => r.employee || <span className="muted">Not assigned</span>,
    deadline: r => <span className={late(r) ? 'late' : ''}>{fmtDate(r.deadline)}{r.deadline_time ? ' · ' + r.deadline_time : ''}</span>,
    completed_at: r => (r.completed_at ? <b style={{ color: 'var(--green)' }}>{fmtDateTime(r.completed_at)}</b> : '—'),
  },
  csv: { deadline: r => r.deadline || '' },
  detailFields: ['employee', 'deadline', 'related', 'description', 'remark', 'completed_at'],
  detailExtra: t => <TaskChat key={t.id} taskId={t.id} who="admin" />,
  actions: (r, reload, ui) => (r.status === 'Done' ? [] : [['Done', async () => { await api('PUT', 'tasks/' + r.id, { status: 'Done' }); ui.toast('Task marked done'); reload(); }]]),
};

export default function Tasks() {
  // Admin Tasks page kholte hi "task complete" alerts dekh liye gaye maane jate hain
  useEffect(() => { const t = setTimeout(() => api('POST', 'notifications/read', { kind: 'task_done' }).catch(() => {}), 2500); return () => clearTimeout(t); }, []);
  return <ListPage resource="tasks" cfg={config} />;
}
