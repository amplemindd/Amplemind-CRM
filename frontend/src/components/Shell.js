import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from './AuthContext';
import Icon from './Icon';
import { LiveProvider } from './LiveProvider';
import MessageFab from './MessageFab';

// Mobile ke bottom bar me kaun se 4 page dikhein (pehle jo mile). Baaki sab "Menu" me.
const QUICK = ['Dashboard', 'Customers & leads', 'My leads', 'Employees', 'Tasks', 'My tasks', 'Payments', 'Follow-ups', 'My attendance', 'Pipeline', 'Campaigns', 'Quotations'];

// Admin aur Employee dono ka layout: desktop par sidebar, phone / tablet par top bar + bottom navigation + slide-in menu.
// nav = [[groupName, [[path, label, icon, badgeKey?]]]], badges = { badgeKey: count }, root = '/admin' ya '/employee'
export default function Shell({ portal, root, nav, badges = {}, theme = '', children }) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  const items = useMemo(() => nav.flatMap(([, list]) => list), [nav]);
  const quick = useMemo(() => {
    const picked = QUICK.map(l => items.find(i => i[1] === l)).filter(Boolean);
    const rest = items.filter(i => !picked.includes(i));
    return [...picked, ...rest].slice(0, 4);
  }, [items]);
  const current = useMemo(() => {
    const hit = items.filter(([to]) => pathname === to || (to !== root && pathname.startsWith(to + '/')));
    return hit.sort((a, b) => b[0].length - a[0].length)[0];
  }, [items, pathname, root]);
  const title = current ? current[1] : pathname === root ? 'Dashboard' : portal;
  const initial = String((user && user.name) || '?')[0].toUpperCase();
  const uid = user && user.id, urole = user && user.role;
  const [photo, setPhoto] = useState('');
  // Admin / employee ki profile photo topbar aur menu me dikhao (photo na ho to naam ka pehla akshar)
  useEffect(() => {
    if (urole !== 'employee' && urole !== 'admin') { setPhoto(''); return undefined; }
    let on = true;
    api('GET', urole === 'admin' ? 'auth/profile' : 'my/profile').then(p => { if (on) setPhoto((p && p.photo) || ''); }).catch(() => {});
    const h = e => setPhoto(typeof e.detail === 'string' ? e.detail : '');
    window.addEventListener('amp-photo', h); // My profile se photo badalte hi yahan bhi badal jaye
    return () => { on = false; window.removeEventListener('amp-photo', h); };
  }, [uid, urole]);
  const avatar = photo ? <img src={photo} alt="" /> : initial;

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => { // menu khula ho to peeche ka page scroll na ho, Esc se band ho
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const k = e => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', k);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', k); };
  }, [open]);
  useEffect(() => { // employee portal ka teal rang popup / toast par bhi aaye
    if (!theme) return undefined;
    document.body.classList.add(theme);
    return () => document.body.classList.remove(theme);
  }, [theme]);

  const badge = key => (key && badges[key] > 0 ? badges[key] : 0);

  return (
    <LiveProvider>
    <div className={'app ' + theme}>
      <header className="topbar">
        <button type="button" className="tb-btn" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}><Icon name="menu" /></button>
        <div className="tb-title"><b>{title}</b><small>Amplemind {portal}</small></div>
        <span className="av tb-av" aria-hidden="true">{avatar}</span>
      </header>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={'side ' + (open ? 'open' : '')} aria-label="Main menu">
        <div className="brand"><i>A</i><div><b>Amplemind</b><span>{portal}</span></div>
          <button type="button" className="btn icon side-x" aria-label="Close menu" onClick={() => setOpen(false)}><Icon name="x" /></button></div>
        {nav.map(([g, list]) => (
          <div key={g}>
            <div className="grp">{g}</div>
            {list.map(([to, label, icon, key]) => (
              <NavLink key={to} to={to} end={to === root} className={({ isActive }) => (isActive ? 'on' : '')}>
                <Icon name={icon} />{label}{badge(key) > 0 && <span className="cnt">{badge(key)}</span>}
              </NavLink>))}
          </div>))}
        <div className="me">
          <span className="av">{avatar}</span>
          <div><b>{user && user.name}</b><small>{user && user.role === 'admin' ? 'Administrator' : (user && user.title) || 'Employee'}</small></div>
          <button type="button" className="btn icon" title="Log out" aria-label="Log out" onClick={logout}><Icon name="logout" /></button>
        </div>
      </aside>
      <main className="page">{children}</main>

      {/* Phone / tablet: neeche ka navigation bar */}
      <nav className="bnav" aria-label="Quick navigation">
        {quick.map(([to, label, icon, key]) => (
          <NavLink key={to} to={to} end={to === root} className={({ isActive }) => 'bn' + (isActive ? ' on' : '')}>
            <Icon name={icon} /><span className="lbl">{label.replace('Customers & leads', 'Leads').replace('Follow-ups', 'Follow-up').replace('My attendance', 'Attendance').replace('My tasks', 'Tasks').replace('My leads', 'Leads')}</span>
            {badge(key) > 0 && <span className="cnt">{badge(key)}</span>}
          </NavLink>))}
        <button type="button" className="bn" aria-label="Open full menu" onClick={() => setOpen(true)}><Icon name="menu" /><span className="lbl">Menu</span></button>
      </nav>

      {/* Messages: sidebar me nahi, neeche right corner ka floating button */}
      <MessageFab who={root === '/admin' ? 'admin' : 'employee'} count={(root === '/admin' ? badges.messages : badges.unread) || 0} />
    </div>
    </LiveProvider>
  );
}