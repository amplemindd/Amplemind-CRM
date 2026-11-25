import { api } from '../api';
import { DEPARTMENTS } from '../config';
import { copyText, deptUrl, genPassword, wa } from '../utils';

const slugOf = key => (DEPARTMENTS.find(d => d.key === key) || DEPARTMENTS[0]).slug;

// Credentials ka popup (copy + WhatsApp)
export const showCreds = (ui, name, phone, department, username, password) => {
  const text = `Employee: ${name}\nDepartment: ${department}\nLogin page: ${deptUrl(slugOf(department))}\nUsername: ${username.trim().toLowerCase()}\nPassword: ${password}`;
  ui.notice('Login is ready. Share these details', text, [
    { label: 'Copy', onClick: async t => ui.toast((await copyText(t)) ? 'Copied' : 'Copy failed', 'ok') },
    ...(phone ? [{ label: 'Send on WhatsApp', onClick: t => wa(phone, `Hi ${name}, your CRM login details:\n\n${t}\n\nPlease change your password after the first login.`) }] : []),
  ]);
};

// "Login" button: admin employee ka username + password + department banata hai (ya reset / disable karta hai)
export const manageLogin = (r, reload, ui) => async () => {
  const has = !!r.username;
  const first = (r.name || '').split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  const v = await ui.ask(has ? `Login for ${r.name}` : `Create login for ${r.name}`, [
    { name: 'department', label: 'Department', opts: DEPARTMENTS.map(d => d.key), def: r.department || DEPARTMENTS[0].key },
    { name: 'username', label: 'Username', def: r.username || first, required: true, hint: 'Letters, numbers, dot, dash or underscore' },
    { name: 'password', label: has ? 'New password (leave blank to keep the old one)' : 'Password', def: has ? '' : genPassword(), required: !has, hint: 'At least 6 characters' },
    { name: 'access', label: 'Access', opts: ['Enabled', 'Disabled'], def: has && !r.login_enabled ? 'Disabled' : 'Enabled' },
  ], has ? 'Save login' : 'Create login');
  if (!v) return;
  try {
    await api('POST', `employees/${r.id}/login`, { username: v.username, password: v.password, department: v.department, enabled: v.access === 'Enabled' });
    reload();
    if (!v.password) return ui.toast('Login updated');
    showCreds(ui, r.name, r.phone, v.department, v.username, v.password);
  } catch (e) { ui.toast(e.message, 'err'); }
};

// Naya employee + login ek saath
export const newLogin = (reload, ui, department) => async () => {
  const v = await ui.ask('New employee login', [
    { name: 'name', label: 'Full name', required: true },
    { name: 'department', label: 'Department', opts: DEPARTMENTS.map(d => d.key), def: department || DEPARTMENTS[0].key },
    { name: 'phone', label: 'Phone (for WhatsApp)' },
    { name: 'username', label: 'Username', required: true, hint: 'Letters, numbers, dot, dash or underscore' },
    { name: 'password', label: 'Password', def: genPassword(), required: true, hint: 'At least 6 characters' },
  ], 'Create login');
  if (!v) return;
  try {
    await api('POST', 'employees/with-login', v);
    reload();
    showCreds(ui, v.name, v.phone, v.department, v.username, v.password);
  } catch (e) { ui.toast(e.message, 'err'); }
};
