import ListPage from '../../components/ListPage';
import { printSalarySlip } from '../../printA4';
import { F, fmtMonth, inr, today } from '../../utils';

const sum = (rows, f) => rows.reduce((a, r) => a + f(r), 0);
const thisMonth = () => today().slice(0, 7);

// Side panel me salary slip ka preview
const Preview = r => {
  const earn = (+r.basic || 0) + (+r.hra || 0) + (+r.allowances || 0) + (+r.bonus || 0);
  return (
    <div className="slip">
      <div className="kv"><span>Employee ID</span><div>EMP-{String(r.employee_id || '').padStart(3, '0')}</div></div>
      <div className="kv"><span>Designation</span><div>{r.designation || '—'}</div></div>
      <div className="kv"><span>Pay month</span><div>{fmtMonth(r.slip_month)}</div></div>
      <div className="kv"><span>Days present</span><div>{r.days_present ?? '—'} / {r.working_days ?? '—'}</div></div>
      <div className="two" style={{ marginTop: 12 }}>
        <div className="box g"><b>Earnings</b><div><span>Basic</span><span>{inr(r.basic)}</span></div><div><span>HRA</span><span>{inr(r.hra)}</span></div>
          <div><span>Allowances</span><span>{inr(r.allowances)}</span></div><div><span>Bonus</span><span>{inr(r.bonus)}</span></div><div><b>Total</b><b>{inr(earn)}</b></div></div>
        <div className="box r"><b>Deductions</b><div><span>Total</span><span>{inr(r.deductions)}</span></div></div>
      </div>
      <div className="net"><span>Net pay</span><span>{inr(r.net)}</span></div>
    </div>);
};

// base = 'salary_slips' (admin) ya 'hr/salary_slips' (HR login). Employee dropdown bhi usi hisab se.
const make = hr => ({
  noun: 'salary slip', primary: 'employee', secondary: r => r.designation, required: ['employee_id', 'slip_month'],
  title: 'Salary slips', desc: 'Generate, manage and print employee salary slips.', addLabel: 'Generate salary slip',
  filters: [{ field: 'slip_month', label: 'Month' }, { field: 'employee', label: 'Employee' }],
  cards: rows => [
    ['Total slips', rows.length, true, 'file', 'blue'],
    ['Slips this month', rows.filter(r => r.slip_month === thisMonth()).length, true, 'calendar', 'green'],
    ['Payout this month', sum(rows.filter(r => r.slip_month === thisMonth()), r => +r.net || 0), false, 'rupee', 'violet'],
    ['Total payout', sum(rows, r => +r.net || 0), false, 'wallet', 'amber'],
    ['Average net salary', rows.length ? Math.round(sum(rows, r => +r.net || 0) / rows.length) : 0, false, 'chart', 'blue'],
  ],
  labels: { employee_id: 'Employee ID', designation: 'Designation', slip_month: 'Month', net: 'Salary (₹)', employee: 'Employee name', days_present: 'Days present', paid_on: 'Paid on' },
  fields: [F('employee_id', 'Employee', 'ref', { src: hr ? 'hr/employees' : 'employees', valKey: 'id' }), F('slip_month', 'Month', 'month', { def: () => thisMonth() }),
    F('working_days', 'Working days', 'number'), F('days_present', 'Days present', 'number'),
    F('basic', 'Basic ₹', 'money'), F('hra', 'HRA ₹', 'money'), F('allowances', 'Allowances ₹', 'money'), F('bonus', 'Bonus ₹', 'money'),
    F('deductions', 'Deductions ₹', 'money'), F('paid_on', 'Paid on', 'date'), F('notes', 'Notes', 'textarea')],
  cols: ['employee_id', 'employee', 'designation', 'slip_month', 'days_present', 'net', 'paid_on'],
  render: { employee_id: r => <b style={{ color: 'var(--primary)' }}>EMP-{String(r.employee_id || '').padStart(3, '0')}</b>, employee: r => <b>{r.employee}</b>,
    designation: r => r.designation || <span className="muted">—</span>, slip_month: r => fmtMonth(r.slip_month), net: r => <b>{inr(r.net)}</b> },
  detailFields: ['notes'],
  detailExtra: Preview,
  csv: { employee_id: r => 'EMP-' + String(r.employee_id || '').padStart(3, '0'), slip_month: r => r.slip_month },
  actions: r => [['Print', () => printSalarySlip(r)]],
});

export default function SalarySlips({ base = 'salary_slips' }) {
  return <ListPage resource={base} cfg={make(base !== 'salary_slips')} />;
}
