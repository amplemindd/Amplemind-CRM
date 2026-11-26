import { useEffect, useState } from 'react';
import { api } from '../../api';
import { useAuth } from '../../components/AuthContext';
import ChangePassword from '../../components/ChangePassword';
import ImagePick from '../../components/ImagePick';
import PageHead from '../../components/PageHead';
import { useUI } from '../../components/UI';
import { fmtDate } from '../../utils';

export default function MyProfile() {
  const { user } = useAuth();
  const ui = useUI();
  const [p, setP] = useState(null);
  useEffect(() => { api('GET', 'my/profile').then(setP).catch(e => ui.toast(e.message, 'err')); }, [ui]);
  const savePhoto = async photo => {
    try { await api('PUT', 'my/profile', { photo }); setP(x => ({ ...x, photo })); window.dispatchEvent(new CustomEvent('amp-photo', { detail: photo || '' })); ui.toast(photo ? 'Profile photo updated' : 'Profile photo removed'); } catch (e) { ui.toast(e.message, 'err'); }
  };
  return (
    <>
      <PageHead title="My profile" desc="Your details, photo and password." />
      <div className="dash">
        <div className="card">
          <div className="profile hero">
            <ImagePick round maxPx={320} value={p && p.photo} onChange={savePhoto} label="Add photo" />
            <div><h3 style={{ fontSize: 19 }}>{user && user.name}</h3><span className="muted">{(p && p.role) || (user && user.title) || 'Employee'}</span></div>
          </div>
          <div className="kv"><span>Department</span><b>{(p && p.department) || (user && user.department) || '—'}</b></div>
          <div className="kv"><span>Username</span><b>{user && user.username}</b></div>
          <div className="kv"><span>Phone</span><b>{(p && p.phone) || '—'}</b></div>
          <div className="kv"><span>Email</span><b>{(p && p.email) || '—'}</b></div>
          <div className="kv"><span>Joined</span><b>{p && p.joined ? fmtDate(p.joined) : '—'}</b></div>
          <p className="hint" style={{ marginTop: 12 }}>Need to change your name, phone or role? Ask your admin.</p>
        </div>
        <div><ChangePassword /></div>
      </div>
    </>
  );
}