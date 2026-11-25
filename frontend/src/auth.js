const KEY = 'amplemind_session';
const store = () => window.sessionStorage;
export const getSession = () => { try { return JSON.parse(store().getItem(KEY)); } catch (e) { return null; } };
export const saveSession = (token, user) => { try { store().setItem(KEY, JSON.stringify({ token, user })); } catch (e) { /* storage band hai */ } };
export const clearSession = () => { try { store().removeItem(KEY); } catch (e) { /* ignore */ } };