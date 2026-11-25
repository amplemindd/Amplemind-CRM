import { useState } from 'react';
import { api } from '../api';
import { fmtMins, fmtTime } from '../utils';
import Icon from './Icon';
import { useUI } from './UI';

// Aaj ki attendance: Check in / Check out
export default function AttendanceCard({ today, reload }) {
  const ui = useUI();
  const [busy, setBusy] = useState(false);
  const run = async (path, body, msg) => {
    setBusy(true);
    try { await api('POST', 'my/attendance/' + path, body); ui.toast(msg); await reload(); } catch (e) { ui.toast(e.message, 'err'); }
    setBusy(false);
  };
  const checkOut = async () => {
    const v = await ui.ask('Check out for today', [{ name: 'note', label: 'What did you work on today? (optional)', placeholder: 'e.g. 5 calls, 2 demos, 1 quotation sent' }], 'Check out');
    if (v) run('check-out', { note: v.note }, 'Checked out. See you tomorrow!');
  };
  const done = today && today.check_out;
  const mins = today && today.minutes;
  return (
    <div className="card att">
      <h3>Today’s attendance</h3>
      {!today ? (
        <>
          <p className="muted">You have not checked in yet.</p>
          <button className="btn primary lg" disabled={busy} onClick={() => run('check-in', {}, 'Checked in. Have a great day!')}><Icon name="clock" />Check in</button>
        </>
      ) : !done ? (
        <>
          <div className="att-time"><b>{fmtTime(today.check_in)}</b><span>Checked in</span></div>
          <button className="btn danger lg" disabled={busy} onClick={checkOut}><Icon name="logout" />Check out</button>
        </>
      ) : (
        <>
          <div className="att-row"><div className="att-time"><b>{fmtTime(today.check_in)}</b><span>In</span></div><div className="att-time"><b>{fmtTime(today.check_out)}</b><span>Out</span></div>
            <div className="att-time"><b>{fmtMins(mins)}</b><span>Worked</span></div></div>
          <p className="muted" style={{ marginTop: 10 }}>Day complete. Thank you!</p>
        </>
      )}
    </div>
  );
}
