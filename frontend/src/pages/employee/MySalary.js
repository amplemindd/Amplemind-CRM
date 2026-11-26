import { useEffect, useState } from 'react';
import { api } from '../../api';
import Icon from '../../components/Icon';
import PageHead from '../../components/PageHead';
import { useUI } from '../../components/UI';
import { printSalarySlip } from '../../printA4';
import { fmtDate, fmtMonth, inr } from '../../utils';

export default function MySalary() {
  const ui = useUI();
  const [rows, setRows] = useState(null);
  useEffect(() => { api('GET', 'my/salary').then(setRows).catch(e => { setRows([]); ui.toast(e.message, 'err'); }); }, [ui]);
  return (
    <>
      <PageHead title="My salary slips" desc="Your monthly salary slips. Print or save as PDF." />
      <div className="panel">
        {rows === null ? <div style={{ padding: 20 }}><div className="sk" /></div> : rows.length === 0 ? (
          <div className="empty"><Icon name="inbox" /><h3>No salary slips yet</h3><p>Your slip appears here once it is created for a month.</p></div>
        ) : (
          <div className="scroll"><table className="rt">
            <thead><tr><th>Month</th><th>Days present</th><th className="num">Net salary</th><th>Paid on</th><th /></tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.id}><td className="is-prim" data-label="Month"><b>{fmtMonth(r.slip_month)}</b></td><td data-label="Days present">{r.days_present ?? '—'}</td><td className="num" data-label="Net salary"><b>{inr(r.net)}</b></td><td data-label="Paid on">{fmtDate(r.paid_on)}</td>
                <td className="rt-act"><div className="acts"><button className="btn sm tint" onClick={() => printSalarySlip(r)}><Icon name="print" />Print</button></div></td></tr>))}</tbody>
          </table></div>)}
      </div>
    </>
  );
}