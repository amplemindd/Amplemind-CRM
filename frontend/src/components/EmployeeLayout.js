import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from './AuthContext';
import Shell from './Shell';

const MY_TASKS = ['/employee/tasks', 'My tasks', 'tasks', 'openTasks'];
const ME = ['Me', [['/employee/attendance', 'My attendance', 'calendar'], ['/employee/salary', 'My salary slips', 'rupee'], ['/employee/profile', 'My profile', 'user']]];
const HOME = ['/employee', 'Dashboard', 'grid'];

// Har department ka apna sidebar
export const NAV_BY_DEPT = {
  'HR': [['HR', [HOME, ['/employee/team', 'Employees', 'id'], ['/employee/team-attendance', 'Team attendance', 'calendar'], ['/employee/salary-slips', 'Salary slips', 'rupee'], MY_TASKS]], ME],
  'Developer': [['Work', [HOME, MY_TASKS]], ME],
  'Trainer': [['Work', [HOME, MY_TASKS]], ME],
  'Digital Marketing': [['Work', [HOME, ['/employee/campaigns', 'Campaigns', 'mega'], MY_TASKS]], ME],
  'Sales Team': [['Work', [HOME, ['/employee/leads', 'My leads', 'users'], ['/employee/followups', 'Follow-ups', 'bell', 'followups'], MY_TASKS]], ME],
};

export default function EmployeeLayout() {
  const [badges, setBadges] = useState({});
  const { pathname } = useLocation();
  const { user } = useAuth();
  const dept = (user && user.department) || '';

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

  return <Shell portal={dept || 'Employee'} root="/employee" nav={NAV_BY_DEPT[dept] || [['Work', [HOME, MY_TASKS]], ME]} badges={badges} theme="employee"><Outlet /></Shell>;
}