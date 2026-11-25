import { useState } from 'react';
import { api } from '../api';
import { useUI } from './UI';

// Admin aur employee dono apna password yahin se badalte hain
export default function ChangePassword() {
  const ui = useUI();
  const [v, setV] = useState({ current: '', next: '', again: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, x) => { setV(s => ({ ...s, [k]: x })); setErr(''); };
  const save = async e => {
    e.preventDefault();
    if (!v.current) return setErr('Enter your current password');
    if (v.next.length < 6) return setErr('New password must be at least 6 characters');
    if (v.next !== v.again) return setErr('The two new passwords do not match');
    setBusy(true);
    try { await api('POST', 'auth/change-password', { current: v.current, next: v.next }); ui.toast('Password changed'); setV({ current: '', next: '', again: '' }); }
    catch (er) { setErr(er.message); }
    setBusy(false);
  };
  return (
    <form className="card" onSubmit={save}>
      <h3>Change password</h3>
      <div className="fg" style={{ gridTemplateColumns: '1fr', marginTop: 10 }}>
        <div><label htmlFor="cp1">Current password</label><input id="cp1" type="password" autoComplete="current-password" value={v.current} onChange={e => set('current', e.target.value)} /></div>
        <div><label htmlFor="cp2">New password</label><input id="cp2" type="password" autoComplete="new-password" value={v.next} onChange={e => set('next', e.target.value)} /><div className="hint">At least 6 characters</div></div>
        <div><label htmlFor="cp3">Repeat new password</label><input id="cp3" type="password" autoComplete="new-password" value={v.again} onChange={e => set('again', e.target.value)} /></div>
        {err && <div className="alert" role="alert">{err}</div>}
      </div>
      <button className="btn primary" style={{ marginTop: 16 }} disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
    </form>
  );
}
