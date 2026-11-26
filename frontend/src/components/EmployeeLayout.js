import { useEffect, useState } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from './AuthContext';
import Shell from './Shell';

// Har department ka apna sidebar. b = panel ka link (/hr, /trainer ...)
const navFor = b => {
  const HOME = [b, 'Dashboard', 'grid'];
  const MY_TASKS = [`${b}/tasks`, 'My tasks', 'tasks', 'openTasks'];
  const ME = ['Me', [[`${b}/attendance`, 'My attendance', 'calendar'], [`${b}/salary`, 'My salary slips', 'rupee'], [`${b}/profile`, 'My profile', 'user']]];
  return {
    'HR': [['HR', [HOME, [`${b}/team`, 'Employees', 'id'], [`${b}/team-attendance`, 'Team attendance', 'calendar'], [`${b}/salary-slips`, 'Salary slips', 'rupee'], MY_TASKS]], ME],
    'Developer': [['Work', [HOME, MY_TASKS]], ME],
    'Trainer': [['Work', [HOME, MY_TASKS]], ME],
    'Digital Marketing': [['Work', [HOME, [`${b}/campaigns`, 'Campaigns', 'mega'], MY_TASKS]], ME],
    'Sales Team': [['Work', [HOME, [`${b}/leads`, 'My leads', 'users'], [`${b}/followups`, 'Follow-ups', 'bell', 'followups'], MY_TASKS]], ME],
    _default: [['Work', [HOME, MY_TASKS]], ME],
  };
};

export default function EmployeeLayout() {
  const [badges, setBadges] = useState({});
  const { pathname } = useLocation();
  const { slug } = useParams();
  const { user } = useAuth();
  const dept = (user && user.department) || '';
  const base = '/' + slug;
  const navs = navFor(base);

  useEffect(() => { api('GET', 'my/dashboard').then(d => setBadges(b => ({ ...b, openTasks: d.openTasks, followups: d.followups }))).catch(() => {}); }, [pathname]);

  // Har 10 sec me: admin ka naya message, naya task
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const s = await api('GET', 'my/messages/summary');
        if (stop) return;
        setBadges(b => ({ ...b, unread: s.unread, openTasks: s.openTasks }));
        // Toast + sound ab LiveProvider (Shell) dikhata hai, yahan sirf badges update hote hain
      } catch (e) { /* agli baar */ }
    };
    tick();
    const t = setInterval(tick, 10000);
    return () => { stop = true; clearInterval(t); };
  }, []);

  return <Shell portal={dept || 'Employee'} root={base} nav={navs[dept] || navs._default} badges={badges} theme="employee"><Outlet /></Shell>;
}
