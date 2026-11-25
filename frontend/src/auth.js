import { MODE } from './appMode';

// Login phone me save rehta hai (localStorage): ek baar login ke baad dobara login nahi maangta, jab tak Logout na dabao.
// Har app (Admin / HR / Trainer ...) ka apna alag session hota hai, isliye ek app ka login doosre me nahi dikhta.
const KEY = 'amplemind_session' + (MODE ? '_' + MODE : '');
const store = () => window.localStorage;
export const getSession = () => { try { return JSON.parse(store().getItem(KEY)); } catch (e) { return null; } };
export const saveSession = (token, user) => { try { store().setItem(KEY, JSON.stringify({ token, user })); } catch (e) { /* storage band hai */ } };
export const clearSession = () => { try { store().removeItem(KEY); } catch (e) { /* ignore */ } };
