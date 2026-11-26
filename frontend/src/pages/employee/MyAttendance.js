import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';
import { fmtDate, fmtMins, fmtTime } from '../../utils';
import AttendanceCard from '../../components/AttendanceCard';
import PageHead from '../../components/PageHead';
import StatStrip from '../../components/StatStrip';
import { useUI } from '../../components/UI';

export default function MyAttendance() {
  const ui = useUI();
  const [data, setData] = useState(null);
  const load = useCallback(() => api('GET', 'my/attendance').then(setData), []);
  useEffect(() => { load().catch(e => ui.toast(e.message, 'err')); }, [load, ui]);
  if (!data) return <div className="sk" style={{ height: 60 }} />;

  const total = data.rows.reduce((a, r) => a + (r.minutes || 0), 0), days = data.rows.length;
  return (
    <>
      <PageHead title="Attendance" desc={`Your attendance for ${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}.`} />
      <StatStrip items={[['Days present', days, true], ['Total hours', fmtMins(total), true], ['Average per day', days ? fmtMins(Math.round(total / days)) : '—', true]]} />
      <div className="dash">
        <div className="panel">
          {data.rows.length === 0 ? <div className="empty"><h3>No attendance yet this month</h3><p>Check in to start today’s record.</p></div> : (
            <div className="scroll"><table className="rt">
              <thead><tr><th>Date</th><th>In</th><th>Out</th><th>Worked</th><th>Day note</th></tr></thead>
              <tbody>{data.rows.map(r => (
                <tr key={r.id}><td className="is-prim" data-label="Date"><b>{fmtDate(r.att_date)}</b></td><td data-label="In">{fmtTime(r.check_in)}</td><td data-label="Out">{r.check_out ? fmtTime(r.check_out) : <span className="pill amber">Working</span>}</td>
                  <td data-label="Worked">{fmtMins(r.minutes)}</td><td data-label="Day note">{r.note || <span className="muted">—</span>}</td></tr>))}</tbody>
            </table></div>)}
        </div>
        <div><AttendanceCard today={data.today} reload={load} /></div>
      </div>
    </>
  );
}