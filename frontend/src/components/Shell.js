import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Icon from './Icon';
import MessageFab from './MessageFab';

// Admin aur Employee dono ka sidebar layout.
// nav = [[groupName, [[path, label, icon, badgeKey?]]]], badges = { badgeKey: count }, root = '/admin' ya '/employee'
export default function Shell({ portal, root, nav, badges = {}, theme = '', children }) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); }, [pathname]);
  return (
    <div className={'app ' + theme}>
      <div className="topbar"><button aria-label="Open menu" onClick={() => setOpen(true)}><Icon name="menu" /></button>Amplemind {portal}</div>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={'side ' + (open ? 'open' : '')}>
        <div className="brand"><i>A</i><div><b>Amplemind</b><span>{portal}</span></div></div>
        {nav.map(([g, items]) => (
          <div key={g}>
            <div className="grp">{g}</div>
            {items.map(([to, label, icon, badge]) => (
              <NavLink key={to} to={to} end={to === root} className={({ isActive }) => (isActive ? 'on' : '')}>
                <Icon name={icon} />{label}{badge && badges[badge] > 0 && <span className="cnt">{badges[badge]}</span>}
              </NavLink>))}
          </div>))}
        <div className="me">
          <span className="av">{String((user && user.name) || '?')[0].toUpperCase()}</span>
          <div><b>{user && user.name}</b><small>{user && user.role === 'admin' ? 'Administrator' : (user && user.title) || 'Employee'}</small></div>
          <button className="btn icon" title="Log out" aria-label="Log out" onClick={logout}><Icon name="logout" /></button>
        </div>
      </aside>
      <main className="page">{children}</main>
      {/* Messages: sidebar me nahi, neeche right corner ka floating button */}
      <MessageFab who={root === '/admin' ? 'admin' : 'employee'} count={(root === '/admin' ? badges.messages : badges.unread) || 0} />
    </div>
  );
}