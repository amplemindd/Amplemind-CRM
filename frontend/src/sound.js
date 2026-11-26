// Sound (koi mp3 nahi, browser khud awaaz banata hai) + desktop notification
let ctx = null;
const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
const getCtx = () => {
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
};

// Browser sound tabhi bajne deta hai jab user ne page par ek baar click / key dabayi ho. (Notification permission LiveProvider ke banner se maangte hain)
let unlocked = false;
export const unlockAudio = () => {
  if (unlocked || typeof window === 'undefined') return;
  unlocked = true;
  const on = () => { getCtx(); };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, on, { once: true, passive: true }));
};

const tone = (c, freq, t0, dur, vol = 0.5) => {
  const o = c.createOscillator(), g = c.createGain();
  o.type = 'triangle'; o.frequency.value = freq; // triangle: sine se zyada tez aur saaf sunai deta hai
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(c.destination);
  o.start(t0); o.stop(t0 + dur + 0.05);
};

// Phone vibrate (Android Chrome / installed app). iPhone browser vibrate allow nahi karta.
const buzz = pattern => { try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* ignore */ } };

// Notification ki halki "ting-ting" + vibrate
export const chime = () => {
  buzz([700, 200, 700, 200, 1000]);
  const c = getCtx(); if (!c) return;
  const t = c.currentTime;
  tone(c, 880, t, 0.3); tone(c, 1175, t + 0.2, 0.3); tone(c, 1568, t + 0.4, 0.7); // 3 notes: ting-ting-tiing
};

// Call ki ring. 'in' = samne wale ki phone-jaisi ring, 'back' = call karne wale ko "ring ja rahi hai" ki awaaz. Band karne ke liye return wala function chalao.
export const startRing = kind => {
  const c = getCtx();
  if (!c) { if (kind === 'in') { const v = () => buzz([1500, 400, 1500]); v(); const vid = setInterval(v, 2800); return () => { clearInterval(vid); buzz(0); }; } return () => {}; }
  const play = () => {
    if (kind === 'in') buzz([1500, 400, 1500]); // aane wali call par phone vibrate
    const t = c.currentTime;
    if (kind === 'in') [0, 0.55, 1.1].forEach(o => { tone(c, 440, t + o, 0.45, 0.55); tone(c, 480, t + o, 0.45, 0.55); });
    else tone(c, 425, t, 1.2, 0.2);
  };
  play();
  const id = setInterval(play, kind === 'in' ? 2800 : 3500); // incoming call: jab tak utha na lo / cut na ho, ring + vibrate chalta rahega
  return () => { clearInterval(id); if (kind === 'in') buzz(0); };
};

// Tab / app background me ho to phone ke notification bar me dikhao (pop up + vibrate).
// Service worker se dikhate hain (mobile par yahi chalta hai); push wale notification ka tag same hai, isliye double nahi aata.
export const desktopNotify = (title, body, tag) => {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (!document.hidden && document.hasFocus()) return;
    const seg = String(window.__APP__ || '').trim() || 'admin';
    const icon = '/icons/' + seg + '-192.png', badge = '/icons/badge.png';
    const call = tag === 'crm-call';
    const opts = { body: body || '', tag: tag || undefined, renotify: !!tag, icon, badge, silent: false, requireInteraction: call,
      vibrate: call ? [1500, 400, 1500, 400, 1500] : [700, 200, 700, 200, 1000], data: { url: window.location.pathname || '/' } };
    const legacy = () => { try { const n = new Notification(title, { body: opts.body, tag: opts.tag }); n.onclick = () => { window.focus(); n.close(); }; } catch (e) { /* ignore */ } };
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
      navigator.serviceWorker.getRegistration().then(reg => (reg ? reg.showNotification(title, opts) : legacy())).catch(legacy);
    } else legacy();
  } catch (e) { /* kuch browsers me allowed nahi */ }
};
