import { useEffect, useState } from 'react';
import { api } from '../../api';
import { openDataUrl } from '../../components/FilePick';
import Icon from '../../components/Icon';
import ListPage from '../../components/ListPage';
import { manageLogin } from '../../components/manageLogin';
import { DEPARTMENTS } from '../../config';
import { F, fmtDate } from '../../utils';

const DOCS = [['aadhaar_photo', 'Aadhaar card'], ['passbook_photo', 'Bank passbook'], ['address_proof', 'Address proof'], ['resume', 'Resume'], ['offer_letter', 'Offer letter']];

// Side panel me employee ke documents (kholne ke liye View dabao)
function Docs({ resource, id, name }) {
  const [d, setD] = useState(null);
  useEffect(() => { let on = true; api('GET', `${resource}/${id}/documents`).then(x => { if (on) setD(x); }).catch(() => { if (on) setD({}); }); return () => { on = false; }; }, [resource, id]);
  return (
    <div className="docs" style={{ marginTop: 14 }}>
      <div className="kv" style={{ display: 'block' }}><span>Documents</span></div>
      {d === null ? <p className="muted">Loading…</p> : DOCS.map(([k, label]) => (
        <div className="drow" key={k}>
          <Icon name="file" /><span>{label}</span>
          {d[k] ? <button type="button" className="btn sm" onClick={() => openDataUrl(d[k], `${name || 'employee'}-${k}`)}>View</button> : <span className="muted" style={{ flex: 'none' }}>Not added</span>}
        </div>))}
    </div>);
}

const make = hr => ({
  noun: 'employee', primary: 'name', secondary: r => r.email || r.phone, badges: ['status'], required: ['name'], drawerWide: true,
  title: 'Employees', desc: hr ? 'Manage your team, roles and details.' : 'Manage your team and roles. Logins are created from the Employee logins page.', addLabel: 'Add employee',
  tabs: [['All employees', () => true], ['Active', r => r.status === 'Active'], ['Inactive', r => r.status === 'Inactive']],
  filters: [...(hr ? [] : [{ field: 'department', label: 'Department', opts: DEPARTMENTS.map(d => d.key) }]), { field: 'role', label: 'Role' }],
  cards: rows => [
    ['Total employees', rows.length, true, 'users', 'blue'],
    ['Active employees', rows.filter(r => r.status === 'Active').length, true, 'check', 'green'],
    ['Inactive', rows.filter(r => r.status === 'Inactive').length, true, 'clock', 'amber'],
    ['With login', rows.filter(r => r.username).length, true, 'key', 'violet'],
    ['Departments', new Set(rows.map(r => r.department).filter(Boolean)).size, true, 'columns', 'red'],
  ],
  labels: { login: 'Portal login', role: 'Role / designation', id: 'Employee ID', referred_by: 'Referred by', aadhaar: 'Aadhaar number', bank_holder: 'Account holder',
    bank_name: 'Bank', bank_account: 'Account number', ifsc: 'IFSC code', branch: 'Branch', upi: 'UPI ID', joined: 'Joining date' },
  fields: [
    F('photo', 'Profile photo', 'image', { round: true, maxPx: 400, pick: 'Choose photo' }),
    F('name', 'Full name'), F('role', 'Role / designation'),
    ...(hr ? [] : [F('department', 'Department', 'select', { opts: DEPARTMENTS.map(d => d.key) })]),
    F('phone', 'Phone'), F('email', 'Email'), F('joined', 'Joining date', 'date'),
    F('status', 'Status', 'select', { opts: ['Active', 'Inactive'], def: () => 'Active' }),
    F('referred_by', 'Referred by (optional)', 'text', { hint: 'Name of the person who referred this employee' }),
    F('address', 'Address', 'textarea'),
    F('aadhaar', 'Aadhaar number (12 digits)', 'text', { section: 'Aadhaar card' }),
    F('aadhaar_photo', 'Card photo or scan (optional)', 'image', { lazy: true, maxPx: 1100, quality: 0.7, pick: 'Choose file' }),
    F('bank_holder', 'Account holder name', 'text', { section: 'Bank details' }), F('bank_name', 'Bank name'), F('bank_account', 'Account number'),
    F('ifsc', 'IFSC code'), F('branch', 'Branch'), F('upi', 'UPI ID (optional)'),
    F('passbook_photo', 'Bank passbook photo (optional)', 'file', { lazy: true, pick: 'Choose photo / PDF' }),
    F('address_proof', 'Address proof (optional)', 'file', { lazy: true, pick: 'Choose photo / PDF', section: 'Documents', hint: 'Photo, PDF or Word file, max 3 MB each' }),
    F('resume', 'Resume (optional)', 'file', { lazy: true, pick: 'Choose PDF / Word' }),
    F('offer_letter', 'Offer letter (optional)', 'file', { lazy: true, pick: 'Choose PDF / Word' }),
    F('notes', 'Notes', 'textarea', { section: 'Other' }),
  ],
  cols: ['id', 'name', 'department', 'role', 'phone', 'joined', 'status', ...(hr ? [] : ['login'])],
  detailFields: ['id', 'department', 'role', 'phone', 'email', 'joined', 'referred_by', 'address', 'aadhaar', 'bank_holder', 'bank_name', 'bank_account', 'ifsc', 'branch', 'upi', 'notes', ...(hr ? [] : ['login'])],
  detailExtra: r => <Docs key={r.id} resource={hr ? 'hr/employees' : 'employees'} id={r.id} name={r.name} />,
  detailTop: r => (r.photo ? <img className="dphoto" src={r.photo} alt={r.name} /> : null),
  render: {
    name: r => (
      <div className="pn">
        <span className="av sm">{r.photo ? <img src={r.photo} alt="" /> : String(r.name || '?')[0].toUpperCase()}</span>
        <div><b>{r.name || '—'}</b><small>{r.email || r.phone}</small></div>
      </div>),
    id: r => <b style={{ color: 'var(--primary)' }}>EMP-{String(r.id).padStart(3, '0')}</b>,
    login: r => r.username ? (
      <div><span className={'pill ' + (r.login_enabled ? 'green' : 'gray')}>{r.login_enabled ? 'Enabled' : 'Disabled'}</span>
        <small>@{r.username}{r.last_login ? ' · last seen ' + fmtDate(r.last_login) : ' · never logged in'}</small></div>
    ) : <span className="muted">No login yet</span>,
  },
  csv: { id: r => 'EMP-' + String(r.id).padStart(3, '0'), login: r => (r.username ? r.username + (r.login_enabled ? '' : ' (disabled)') : '') },
  actions: hr ? undefined : (r, reload, ui) => [['Login', manageLogin(r, reload, ui)]],
});

// base = 'employees' (admin) ya 'hr/employees' (HR login)
export default function Employees({ base = 'employees' }) {
  return <ListPage resource={base} cfg={make(base !== 'employees')} />;
}