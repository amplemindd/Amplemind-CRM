import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';
import Icon from '../../components/Icon';
import PageHead from '../../components/PageHead';
import { manageLogin, newLogin } from '../../components/manageLogin';
import { useUI } from '../../components/UI';
import { DEPARTMENTS } from '../../config';
import { copyText, fmtDate } from '../../utils';

const ALL = 'All';
// Login link hamesha site ke root se banta hai (e.g. https://site.com/hr)
const loginLink = slug => window.location.origin + '/' + slug;

// Admin yahin se HR / Developer / Trainer / Digital Marketing / Sales Team ke login banata hai
export default function EmployeeLogins() {
  const ui = useUI();
  const [rows, setRows] = useState(null);
  const [dept, setDept] = useState(ALL);
  const load = useCallback(() => api('GET', 'employees').then(setRows).catch(e => { setRows([]); ui.toast(e.message, 'err'); }), [ui]);
  useEffect(() => { load(); }, [load]);

  const isAll = dept === ALL;
  const d = DEPARTMENTS.find(x => x.key === dept);
  const inDept = k => (rows || []).filter(r => r.department === k);
  const list = isAll ? (rows || []) : inDept(dept);
  const noDept = (rows || []).filter(r => !DEPARTMENTS.some(x => x.key === r.department));
  const createNew = newLogin(load, ui, isAll ? undefined : dept);
  const copyLink = async slug => ui.toast((await copyText(loginLink(slug))) ? 'Link copied' : 'Copy failed');

  return (
    <>
      <PageHead title="Employee logins" desc="Every department has its own login page and its own menu. Create the username and password here.">
        <button className="btn primary" onClick={createNew}><Icon name="plus" />New login</button>
      </PageHead>
      <div className="tools"><div className="chips">
        <button className={'chip ' + (isAll ? 'on' : '')} onClick={() => setDept(ALL)}>All<small>{(rows || []).length}</small></button>
        {DEPARTMENTS.map(x => <button key={x.key} className={'chip ' + (dept === x.key ? 'on' : '')} onClick={() => setDept(x.key)}>{x.label}<small>{inDept(x.key).length}</small></button>)}
      </div></div>

      <div className="card" style={{ marginBottom: 16 }}>
        {isAll ? (
          <>
            <div className="dept-head"><h3>Department login pages</h3></div>
            {DEPARTMENTS.map(x => (
              <div key={x.slug} style={{ marginTop: 10 }}><b>{x.label}</b>
                <div className="linkbox"><code>{loginLink(x.slug)}</code>
                  <button className="btn sm" onClick={() => copyLink(x.slug)}><Icon name="copy" />Copy</button></div></div>))}
          </>
        ) : (
          <>
            <div className="dept-head"><h3>{d.label} login page</h3></div>
            <div className="linkbox"><code>{loginLink(d.slug)}</code>
              <button className="btn sm" onClick={() => copyLink(d.slug)}><Icon name="copy" />Copy</button></div>
          </>
        )}
      </div>

      <div className="panel">
        {rows === null ? <div style={{ padding: 20, display: 'grid', gap: 16 }}>{[1, 2, 3].map(i => <div className="sk" key={i} />)}</div> : list.length === 0 ? (
          <div className="empty"><Icon name="inbox" /><h3>{isAll ? 'No employees yet' : `No ${d.label} login yet`}</h3><p>Create the first one with the New login button.</p>
            <button className="btn primary" onClick={createNew}><Icon name="plus" />New login</button></div>
        ) : (
          <div className="scroll"><table>
            <thead><tr><th>Employee</th>{isAll && <th>Department</th>}<th>Username</th><th>Access</th><th>Last login</th><th /></tr></thead>
            <tbody>{list.map(r => (
              <tr key={r.id}>
                <td><div><b>{r.name}</b><small>{r.phone || r.role}</small></div></td>
                {isAll && <td>{r.department ? <span className="pill blue">{r.department}</span> : <span className="muted">Not set</span>}</td>}
                <td>{r.username ? '@' + r.username : <span className="muted">No login yet</span>}</td>
                <td>{r.username ? <span className={'pill ' + (r.login_enabled ? 'green' : 'gray')}>{r.login_enabled ? 'Enabled' : 'Disabled'}</span> : <span className="muted">—</span>}</td>
                <td>{r.last_login ? fmtDate(r.last_login) : <span className="muted">Never</span>}</td>
                <td><div className="acts"><button className="btn sm tint" onClick={manageLogin(r, load, ui)}><Icon name="key" />{r.username ? 'Edit login' : 'Create login'}</button></div></td>
              </tr>))}</tbody>
          </table></div>)}
      </div>

      {!isAll && noDept.length > 0 && (
        <>
          <div className="phead" style={{ marginTop: 30 }}><div><h1 style={{ fontSize: 18 }}>Employees without a department</h1><p>Choose a department for them so they can log in.</p></div></div>
          <div className="panel"><div className="scroll"><table><tbody>{noDept.map(r => (
            <tr key={r.id}><td><b>{r.name}</b></td><td>{r.role || '—'}</td>
              <td><div className="acts"><button className="btn sm tint" onClick={manageLogin(r, load, ui)}><Icon name="key" />{r.username ? 'Set department' : 'Create login'}</button></div></td></tr>))}</tbody></table></div></div>
        </>)}
    </>
  );
}
