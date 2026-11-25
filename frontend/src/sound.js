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

const tone = (c, freq, t0, dur, vol = 0.18) => {
  const o = c.createOscillator(), g = c.createGain();
  o.type = 'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(c.destination);
  o.start(t0); o.stop(t0 + dur + 0.05);
};

// Notification ki halki "ting-ting"
export const chime = () => {
  const c = getCtx(); if (!c) return;
  const t = c.currentTime;
  tone(c, 880, t, 0.28); tone(c, 1175, t + 0.17, 0.5);
};

// Call ki ring. 'in' = samne wale ki phone-jaisi ring, 'back' = call karne wale ko "ring ja rahi hai" ki awaaz. Band karne ke liye return wala function chalao.
export const startRing = kind => {
  const c = getCtx(); if (!c) return () => {};
  const play = () => {
    const t = c.currentTime;
    if (kind === 'in') [0, 0.55].forEach(o => { tone(c, 440, t + o, 0.45, 0.2); tone(c, 480, t + o, 0.45, 0.2); });
    else tone(c, 425, t, 1.2, 0.12);
  };
  play();
  const id = setInterval(play, kind === 'in' ? 2800 : 3500);
  return () => clearInterval(id);
};

// Tab background me ho to computer / phone ka notification
export const desktopNotify = (title, body, tag) => {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (!document.hidden && document.hasFocus()) return;
    const n = new Notification(title, { body: body || '', tag: tag || undefined });
    n.onclick = () => { window.focus(); n.close(); };
  } catch (e) { /* kuch browsers (mobile) me allowed nahi */ }
};
