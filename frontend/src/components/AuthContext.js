import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler } from '../api';
import { clearSession, getSession, saveSession } from '../auth';
import { useUI } from './UI';

// Login state poori app me yahin se milti hai: const { user, login, logout } = useAuth()
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const ui = useUI();
  const [user, setUser] = useState(() => (getSession() || {}).user || null);

  const login = useCallback(async (role, username, password, department) => {
    const r = await api('POST', `auth/${role}-login`, { username, password, department });
    saveSession(r.token, r.user); setUser(r.user); return r.user;
  }, []);
  const logout = useCallback(() => { clearSession(); setUser(null); }, []);

  useEffect(() => {
    // Token expire ho jaye / admin employee ka login band kar de to yahan se bahar
    setUnauthorizedHandler(() => { clearSession(); setUser(null); ui.toast('Session ended. Please log in again.', 'err'); });
    // Page reload par profile fresh karo
    const s = getSession();
    if (s && s.token) api('GET', 'auth/me').then(u => { saveSession(s.token, u); setUser(u); }).catch(() => {});
  }, [ui]);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
