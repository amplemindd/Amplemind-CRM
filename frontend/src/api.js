import { API_BASE } from './config.js';
import { getSession } from './auth';

let onUnauthorized = () => {};
export const setUnauthorizedHandler = fn => { onUnauthorized = fn; };

// Har request me login token apne aap jata hai. Token expire ho jaye to user logout ho jata hai.
export const api = async (method, url, body) => {
  const s = getSession();
  const headers = { 'Content-Type': 'application/json' };
  if (s && s.token) headers.Authorization = 'Bearer ' + s.token;
  const r = await fetch(API_BASE + url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 401 && s && s.token) onUnauthorized();
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};
