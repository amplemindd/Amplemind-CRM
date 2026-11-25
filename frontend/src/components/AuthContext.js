import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler } from '../api';
import { fitsMode } from '../appMode';
import { clearSession, getSession, saveSession } from '../auth';
import { unsubscribePush } from '../push';
import { useUI } from './UI';

// Login state poori app me yahin se milti hai: const { user, login, logout } = useAuth()
// Login phone me save rehta hai, sirf logout() dabane par hi logout hota hai.
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const ui = useUI();
  const [user, setUser] = useState(() => { const u = (getSession() || {}).user || null; return fitsMode(u) ? u : null; });

  const login = useCallback(async (role, username, password, department) => {
    const r = await api('POST', `auth/${role}-login`, { username, password, department });
    if (!fitsMode(r.user)) throw new Error('This app is not for this login.');
    saveSession(r.token, r.user); setUser(r.user); return r.user;
  }, []);

  const logout = useCallback(async () => {
    // Is phone par notification band karo (max 2 sec ruko), phir logout
    try { await Promise.race([unsubscribePush(), new Promise(r => setTimeout(r, 2000))]); } catch (e) { /* ignore */ }
    clearSession(); setUser(null);
  }, []);

  useEffect(() => {
    // Admin ne employee ka login band kar diya / user delete ho gaya to hi yahan se bahar (token lamba chalta hai)
    setUnauthorizedHandler(() => { clearSession(); setUser(null); ui.toast('Session ended. Please log in again.', 'err'); });
    // App khulte hi profile fresh karo
    const s = getSession();
    if (s && s.token) api('GET', 'auth/me').then(u => { if (fitsMode(u)) { saveSession(s.token, u); setUser(u); } else { clearSession(); setUser(null); } }).catch(() => {});
  }, [ui]);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
