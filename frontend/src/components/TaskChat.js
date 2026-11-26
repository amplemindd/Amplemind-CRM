import { api } from '../api';
import Chat from './Chat';

// Ek task ki chat. who = 'admin' ya 'employee'
export default function TaskChat({ taskId, who, height = 280 }) {
  const base = who === 'admin' ? 'messages' : 'my/messages';
  return (
    <div className="taskchat">
      <h4>Task chat</h4>
      <Chat me={who} height={height} attach placeholder={who === 'admin' ? 'Message the employee…' : 'Write a message…'}
        empty="No messages yet. Ask a question or share an update here."
        load={() => api('GET', `${base}?task_id=${taskId}`)} send={(body, x) => api('POST', base, { task_id: taskId, body, ...x })} />
    </div>
  );
}