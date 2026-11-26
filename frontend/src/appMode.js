import { DEPARTMENTS, deptBySlug } from './config';

// App ka "mode": server /admin, /trainer jaise link par page bhejte waqt window.__APP__ set karta hai.
//   ''            = normal website (/ par saare logins dikhte hain)
//   'admin'       = Admin ka app: sirf Admin login
//   'trainer' ... = us department ka app: sirf usi department ka login
const raw = typeof window !== 'undefined' ? String(window.__APP__ || '') : '';
export const MODE = raw === 'admin' || deptBySlug(raw) ? raw : '';
export const MODE_DEPT = MODE && MODE !== 'admin' ? deptBySlug(MODE) : null;

// Login nahi hai to kahan bhejna hai (us role ka apna link)
export const LOGIN_PATH = MODE ? `/${MODE}` : '/';

// Ye user is app ka hai ya nahi (normal website me sab chalta hai)
export const fitsMode = u => !MODE || !!(u && (MODE === 'admin' ? u.role === 'admin' : u.role === 'employee' && MODE_DEPT && u.department === MODE_DEPT.key));

// Login ke baad user ka ghar: admin = /admin, employee = apne department ka link (/trainer, /hr ...)
export const homeOf = u => {
  if (!u) return '/';
  if (u.role === 'admin') return '/admin';
  const d = DEPARTMENTS.find(x => x.key === u.department);
  return d ? '/' + d.slug : '/';
};
