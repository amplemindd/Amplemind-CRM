import { api } from './api';
import { MODE } from './appMode';

// Push notification (app band ho tab bhi) + "Install app" prompt

export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const keyBytes = s => {
  const raw = atob((s + '='.repeat((4 - (s.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
};

export const registerSW = async () => {
  if (!('serviceWorker' in navigator)) return null;
  try { return await navigator.serviceWorker.register('/sw.js'); } catch (e) { return null; }
};

// Permission mil chuki ho to is phone ko register karo aur server ko batao
export const subscribePush = async () => {
  if (!pushSupported() || Notification.permission !== 'granted') return false;
  const reg = await registerSW(); if (!reg) return false;
  await navigator.serviceWorker.ready;
  const { key } = await api('GET', 'push/key');
  if (!key) return false; // server par VAPID keys set nahi
  const want = keyBytes(key);
  let sub = await reg.pushManager.getSubscription();
  // Server ki VAPID key badal gayi ho to purani subscription kaam nahi karti: hatao aur nayi banao
  if (sub) {
    const have = sub.options && sub.options.applicationServerKey ? new Uint8Array(sub.options.applicationServerKey) : null;
    if (have && (have.length !== want.length || have.some((b, i) => b !== want[i]))) { try { await sub.unsubscribe(); } catch (e) { /* ignore */ } sub = null; }
  }
  if (!sub) {
    try { sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: want }); }
    catch (e) {
      try { const old = await reg.pushManager.getSubscription(); if (old) await old.unsubscribe(); sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: want }); }
      catch (e2) { return false; }
    }
  }
  await api('POST', 'push/subscribe', { subscription: sub.toJSON(), app: MODE });
  return true;
};

export const askPermission = async () => {
  if (!pushSupported()) return 'unsupported';
  const p = await Notification.requestPermission();
  if (p === 'granted') await subscribePush().catch(() => {});
  return p;
};

// Logout par: is phone par notification band
export const unsubscribePush = async () => {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg && (await reg.pushManager.getSubscription());
  if (!sub) return;
  try { await api('POST', 'push/unsubscribe', { endpoint: sub.endpoint }); } catch (e) { /* ignore */ }
  try { await sub.unsubscribe(); } catch (e) { /* ignore */ }
};

// Notification tray saaf (app khulte hi purane notification hata do)
export const closeNotifications = async () => {
  try { const reg = await navigator.serviceWorker.getRegistration(); if (reg) (await reg.getNotifications()).forEach(n => n.close()); } catch (e) { /* ignore */ }
};

// ---- Install app ----
let deferred = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; window.dispatchEvent(new Event('crm-installable')); });
  window.addEventListener('appinstalled', () => { deferred = null; window.dispatchEvent(new Event('crm-installable')); });
}
export const canInstall = () => !!deferred;
export const promptInstall = async () => { if (!deferred) return; deferred.prompt(); try { await deferred.userChoice; } catch (e) { /* ignore */ } deferred = null; window.dispatchEvent(new Event('crm-installable')); };
export const isStandalone = () => typeof window !== 'undefined' && ((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true);
export const isIOS = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

// Service worker page khulte hi register karo (login se pehle bhi). Browser "Install app" tabhi dikhata hai jab ye ready ho.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) window.addEventListener('load', () => { registerSW(); });