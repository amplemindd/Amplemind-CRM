import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MODE } from '../appMode';
import { COMPANY } from '../config';
import { useAuth } from './AuthContext';
import Icon from './Icon';
import InstallButton from './InstallButton';

const ADMIN = {
  badge: 'Admin portal', icon: 'shield', title: 'Admin sign in', sub: 'Manage leads, payments, your team and their logins.',
  headline: 'Run your whole sales team from one place.',
  points: ['Customers, pipeline and follow-ups', 'Quotations, payments and salary slips', 'Create a login for every department'],
};

// Admin aur Department (HR / Developer / Trainer / Digital Marketing / Sales Team) ka login form.
// dept = { key, label, desc } ya undefined (admin)
export default function LoginForm({ role, dept }) {
  const c = role === 'admin' ? ADMIN : {
    badge: `${dept.label} login`, icon: 'user', title: `${dept.label} sign in`, sub: dept.desc,
    headline: `Welcome to the ${dept.label} panel.`,
    points: ['Your own username and password', 'Only the pages for your department', 'Check in and check out every day'],
    hint: 'Your username and password are given to you by your admin.',
  };
  const { login } = useAuth();
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async e => {
    e.preventDefault();
    if (!u.trim() || !p) return setErr('Please enter your username and password');
    setBusy(true); setErr('');
    try { await login(role, u, p, dept && dept.key); } // login hote hi usi link par panel khul jata hai
    catch (er) { setErr(/failed to fetch|networkerror/i.test(er.message) ? 'Cannot reach the server. Please check that the backend is running.' : er.message); setBusy(false); }
  };

  return (
    <div className={'auth ' + (role === 'employee' ? 'employee' : '')}>
      <section className="auth-art">
        <div className="brand"><i>A</i><div><b>Amplemind</b><span>{COMPANY}</span></div></div>
        <div>
          <h2>{c.headline}</h2>
          <ul className="pts">{c.points.map(x => <li key={x}><Icon name="check" />{x}</li>)}</ul>
        </div>
        <small>© {new Date().getFullYear()} {COMPANY}</small>
      </section>
      <main className="auth-main">
        <form className="auth-card" onSubmit={submit} noValidate>
          {!MODE && <Link to="/" className="back"><Icon name="back" />All logins</Link>}
          <span className="auth-badge"><Icon name={c.icon} />{c.badge}</span>
          <h1>{c.title}</h1>
          <p className="muted">{c.sub}</p>

          {err && <div className="alert" role="alert">{err}</div>}

          <div className="field">
            <label htmlFor="login_user">Username</label>
            <input id="login_user" autoFocus autoComplete="username" autoCapitalize="none" spellCheck="false" value={u} onChange={e => { setU(e.target.value); setErr(''); }} />
          </div>
          <div className="field">
            <label htmlFor="login_pass">Password</label>
            <div className="pw">
              <input id="login_pass" type={show ? 'text' : 'password'} autoComplete="current-password" value={p} onChange={e => { setP(e.target.value); setErr(''); }} />
              <button type="button" className="btn icon" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(s => !s)}><Icon name={show ? 'eyeoff' : 'eye'} /></button>
            </div>
          </div>
          <button className="btn primary lg" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          {c.hint && <p className="hint center">{c.hint}</p>}
          <InstallButton />
        </form>
      </main>
    </div>
  );
}
