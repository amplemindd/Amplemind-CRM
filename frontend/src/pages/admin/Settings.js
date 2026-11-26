import { useEffect, useState } from 'react';
import { api } from '../../api';
import { useAuth } from '../../components/AuthContext';
import ChangePassword from '../../components/ChangePassword';
import Icon from '../../components/Icon';
import ImagePick from '../../components/ImagePick';
import PageHead from '../../components/PageHead';
import { useUI } from '../../components/UI';
import { DEPARTMENTS } from '../../config';
import { copyText, deptUrl } from '../../utils';

const EMPTY = { name: '', username: '', email: '', phone: '', photo: '' };

// Admin ka profile: photo + naam, username, email, phone badalna
function Profile() {
  const ui = useUI();
  const { updateUser } = useAuth();
  const [v, setV] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let on = true;
    api('GET', 'auth/profile').then(p => { if (on) setV({ ...EMPTY, ...p }); }).catch(e => { if (on) { setV(EMPTY); ui.toast(e.message, 'err'); } });
    return () => { on = false; };
  }, [ui]);

  const set = (k, x) => { setV(s => ({ ...s, [k]: x })); setErr(''); };
  const savePhoto = async photo => {
    try {
      await api('PUT', 'auth/profile', { photo });
      setV(s => ({ ...s, photo }));
      window.dispatchEvent(new CustomEvent('amp-photo', { detail: photo || '' })); // sidebar / topbar ki photo badal jaye
      ui.toast(photo ? 'Profile photo updated' : 'Profile photo removed');
    } catch (e) { ui.toast(e.message, 'err'); }
  };
  const save = async e => {
    e.preventDefault();
    if (!v.name.trim()) return setErr('Name is required');
    setBusy(true);
    try {
      const r = await api('PUT', 'auth/profile', { name: v.name, username: v.username, email: v.email, phone: v.phone });
      updateUser({ name: r.name, username: r.username });
      ui.toast('Profile saved');
    } catch (er) { setErr(er.message); }
    setBusy(false);
  };

  if (!v) return <div className="card"><div className="sk" style={{ height: 160 }} /></div>;
  return (
    <form className="card" onSubmit={save}>
      <h3>Profile</h3>
      <div className="aprofile">
        <ImagePick round maxPx={320} value={v.photo} onChange={savePhoto} label="Add photo" />
        <div><b style={{ fontSize: 17 }}>{v.name || v.username}</b><div className="muted">Administrator</div></div>
      </div>
      <div className="fg">
        <div><label htmlFor="ap_name">Full name</label><input id="ap_name" value={v.name} onChange={e => set('name', e.target.value)} /></div>
        <div><label htmlFor="ap_user">Username</label><input id="ap_user" autoCapitalize="none" spellCheck="false" value={v.username} onChange={e => set('username', e.target.value)} /></div>
        <div><label htmlFor="ap_mail">Email</label><input id="ap_mail" type="email" value={v.email} onChange={e => set('email', e.target.value)} /></div>
        <div><label htmlFor="ap_phone">Phone</label><input id="ap_phone" value={v.phone} onChange={e => set('phone', e.target.value)} /></div>
      </div>
      {err && <div className="alert" role="alert" style={{ marginTop: 12 }}>{err}</div>}
      <button className="btn primary" style={{ marginTop: 16 }} disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
    </form>
  );
}

export default function Settings() {
  const ui = useUI();
  return (
    <>
      <PageHead title="Admin login" desc="Your profile, password and the login links of every department." />
      <div className="dash">
        <div>
          <Profile />
          <ChangePassword />
        </div>
        <div>
          <div className="card">
            <h3>Department login links</h3>
            <p className="hint">Create the username and password in <b>Employee logins</b>, then share the right link.</p>
            {DEPARTMENTS.map(d => (
              <div key={d.slug} style={{ marginTop: 10 }}><b>{d.label}</b>
                <div className="linkbox"><code>{deptUrl(d.slug)}</code>
                  <button className="btn sm" onClick={async () => ui.toast((await copyText(deptUrl(d.slug))) ? 'Link copied' : 'Copy failed')}><Icon name="copy" />Copy</button></div></div>))}
          </div>
        </div>
      </div>
    </>
  );
}
