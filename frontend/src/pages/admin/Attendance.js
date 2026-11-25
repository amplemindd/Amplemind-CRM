import { useEffect, useState } from 'react';
import { api } from '../../api';
import { fmtMins, fmtTime, today } from '../../utils';
import PageHead from '../../components/PageHead';
import StatStrip from '../../components/StatStrip';
import { useUI } from '../../components/UI';

const Skeleton = () => <div style={{ padding: 20, display: 'grid', gap: 16 }}>{[1, 2, 3].map(i => <div className="sk" key={i} />)}</div>;

// base = 'attendance' (admin) ya 'hr/attendance' (HR login)
export default function Attendance({ base = 'attendance' }) {
  const ui = useUI();
  const [date, setDate] = useState(today());
  const [month, setMonth] = useState(today().slice(0, 7));
  const [day, setDay] = useState(null);
  const [sum, setSum] = useState(null);

  useEffect(() => { if (!date) return; setDay(null); api('GET', base + '?date=' + date).then(setDay).catch(e => ui.toast(e.message, 'err')); }, [date, ui, base]);
  useEffect(() => { if (!month) return; setSum(null); api('GET', base + '/summary?month=' + month).then(setSum).catch(e => ui.toast(e.message, 'err')); }, [month, ui, base]);

  const present = day ? day.filter(r => r.check_in).length : 0;
  return (
    <>
      <PageHead title="Attendance" desc="Employees check in and out from their own login.">
        <div className="field-inline"><label htmlFor="att_date">Date</label><input id="att_date" type="date" max={today()} value={date} onChange={e => setDate(e.target.value)} /></div>
      </PageHead>
      {day && <StatStrip items={[['Present', present, true], ['Absent', day.length - present, true], ['Team size', day.length, true]]} />}
      <div className="panel">
        {!day ? <Skeleton /> : day.length === 0 ? (
          <div className="empty"><h3>No active employees</h3><p>Add employees first from the Employees page.</p></div>
        ) : (
          <div className="scroll"><table>
            <thead><tr><th>Employee</th><th>Status</th><th>Check in</th><th>Check out</th><th>Worked</th><th>Day note</th></tr></thead>
            <tbody>{day.map(r => (
              <tr key={r.id}>
                <td><div className="who"><span className="av">{String(r.name || '?')[0].toUpperCase()}</span><div><b>{r.name}</b><small>{r.role}</small></div></div></td>
                <td><span className={'pill ' + (r.check_in ? 'green' : 'red')}>{r.check_in ? (r.check_out ? 'Present' : 'Working') : 'Absent'}</span></td>
                <td>{fmtTime(r.check_in)}</td><td>{fmtTime(r.check_out)}</td><td>{fmtMins(r.minutes)}</td>
                <td>{r.note || <span className="muted">—</span>}</td>
              </tr>))}</tbody>
          </table></div>)}
      </div>

      <div className="phead" style={{ marginTop: 34 }}>
        <div><h1 style={{ fontSize: 20 }}>Monthly summary</h1><p>Days present and hours worked.</p></div>
        <div className="field-inline"><label htmlFor="att_month">Month</label><input id="att_month" type="month" value={month} onChange={e => setMonth(e.target.value)} /></div>
      </div>
      <div className="panel">
        {!sum ? <Skeleton /> : sum.length === 0 ? <div className="empty"><h3>No active employees</h3></div> : (
          <div className="scroll"><table>
            <thead><tr><th>Employee</th><th className="num">Days present</th><th className="num">Total hours</th><th className="num">Average per day</th></tr></thead>
            <tbody>{sum.map(r => (
              <tr key={r.id}>
                <td><div className="who"><span className="av">{String(r.name || '?')[0].toUpperCase()}</span><b>{r.name}</b></div></td>
                <td className="num">{r.days}</td><td className="num">{fmtMins(r.minutes)}</td><td className="num">{r.days ? fmtMins(Math.round(r.minutes / r.days)) : '—'}</td>
              </tr>))}</tbody>
          </table></div>)}
      </div>
    </>
  );
}
