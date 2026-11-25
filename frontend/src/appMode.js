import { deptBySlug } from './config';

// App ka "mode": server /app/<slug> par page bhejte waqt window.__APP__ set karta hai.
//   ''            = normal website (saare logins dikhte hain)
//   'admin'       = Admin ka app: sirf Admin login
//   'trainer' ... = us department ka app: sirf usi department ka login
const raw = typeof window !== 'undefined' ? String(window.__APP__ || '') : '';
export const MODE = raw === 'admin' || deptBySlug(raw) ? raw : '';
export const MODE_DEPT = MODE && MODE !== 'admin' ? deptBySlug(MODE) : null;

// Login nahi hai to kahan bhejna hai
export const LOGIN_PATH = MODE === 'admin' ? '/admin/login' : MODE_DEPT ? `/login/${MODE_DEPT.slug}` : '/';

// Ye user is app ka hai ya nahi (normal website me sab chalta hai)
export const fitsMode = u => !MODE || !!(u && (MODE === 'admin' ? u.role === 'admin' : u.role === 'employee' && MODE_DEPT && u.department === MODE_DEPT.key));
