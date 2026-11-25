import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { api } from '../api';
import Shell from './Shell';

// Admin ka sidebar. Aur page chahiye to yahan ek line add karo (route App.js me pehle se hai).
const NAV = [
  ['Menu', [['/admin/dashboard', 'Dashboard', 'grid'], ['/admin/customers', 'Customers & leads', 'users'], ['/admin/products', 'Products', 'box'],
    ['/admin/quotations', 'Quotations', 'file'], ['/admin/payments', 'Payments', 'wallet', 'paymentReminders'], ['/admin/payment-history', 'Payment history', 'clock'],
    ['/admin/employees', 'Employees', 'id'], ['/admin/followups', 'Follow-ups', 'bell', 'followups'], ['/admin/pipeline', 'Pipeline', 'columns'],
    ['/admin/tasks', 'Tasks', 'tasks', 'tasksDone'], ['/admin/analytics', 'Analytics', 'chart'],
    ['/admin/salary-slips', 'Salary slips', 'rupee']]],
  ['Employee Login', [['/admin/employee-logins', 'Employee logins', 'key']]],
  ['Admin Login', [['/admin/settings', 'Admin login', 'shield']]],
];

export default function AdminLayout() {
  const [badges, setBadges] = useState({});
  const { pathname } = useLocation();

  useEffect(() => { api('GET', 'dashboard').then(d => setBadges(b => ({ ...b, followups: d.followups, paymentReminders: d.paymentReminders }))).catch(() => {}); }, [pathname]);

  // Har 10 sec me: naye messages, task complete alerts, payment reminders
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const s = await api('GET', 'messages/summary');
        if (stop) return;
        setBadges(b => ({ ...b, messages: s.messages, tasksDone: s.tasksDone, paymentReminders: s.paymentReminders }));
        // Toast + sound ab LiveProvider (Shell) dikhata hai, yahan sirf badges update hote hain
      } catch (e) { /* network issue, agli baar */ }
    };
    tick();
    const t = setInterval(tick, 10000);
    return () => { stop = true; clearInterval(t); };
  }, []);

  return <Shell portal="Admin" root="/admin" nav={NAV} badges={badges}><Outlet /></Shell>;
}