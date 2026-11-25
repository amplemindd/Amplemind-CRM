import { useEffect, useState } from 'react';

// "Install app" button. Android / Chrome par seedha install popup, iPhone par Add to Home Screen ka tareeka dikhata hai.
// App pehle se install ho (ya home screen se khuli ho) to kuch nahi dikhata.
const HIDE_KEY = 'amplemind_install_hide';
const HIDE_DAYS = 7;

const isStandalone = () => (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
const hiddenRecently = () => {
  try { const t = Number(localStorage.getItem(HIDE_KEY) || 0); return t && Date.now() - t < HIDE_DAYS * 86400000; } catch (e) { return false; }
};

const bar = { position: 'fixed', left: 12, bottom: 12, zIndex: 250, display: 'flex', alignItems: 'center', gap: 6, background: '#101a2e', color: '#fff', borderRadius: 999, padding: '4px 4px 4px 4px', boxShadow: '0 8px 24px rgba(0,0,0,.3)', fontFamily: 'inherit' };
const main = { border: 0, background: 'transparent', color: '#fff', font: 'inherit', fontWeight: 700, fontSize: 14, padding: '9px 8px 9px 14px', cursor: 'pointer' };
const close = { border: 0, background: 'rgba(255,255,255,.16)', color: '#fff', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: 14, lineHeight: 1 };
const sheet = { position: 'fixed', left: 12, right: 12, bottom: 64, zIndex: 251, maxWidth: 360, background: '#fff', color: '#101a2e', borderRadius: 14, padding: '14px 16px', boxShadow: '0 12px 36px rgba(0,0,0,.35)', fontSize: 14, lineHeight: 1.5 };

export default function InstallApp() {
  const [evt, setEvt] = useState(null);      // Chrome ka install popup event
  const [ios] = useState(isIos);
  const [done, setDone] = useState(() => isStandalone() || hiddenRecently());
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const onPrompt = e => { e.preventDefault(); setEvt(e); };
    const onInstalled = () => { setEvt(null); setDone(true); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

  const dismiss = () => { try { localStorage.setItem(HIDE_KEY, String(Date.now())); } catch (e) { /* ignore */ } setDone(true); };
  const install = async () => {
    if (evt) {
      evt.prompt();
      try { await evt.userChoice; } catch (e) { /* ignore */ }
      setEvt(null);
    } else setHelp(h => !h);
  };

  if (done || (!evt && !ios)) return null;
  return (
    <>
      {help && (
        <div style={sheet} role="dialog" aria-label="How to install">
          <b>Install on iPhone / iPad</b>
          <ol style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            <li>Open this site in <b>Safari</b>.</li>
            <li>Tap the <b>Share</b> button (square with an arrow).</li>
            <li>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</li>
          </ol>
        </div>
      )}
      <div style={bar}>
        <button type="button" style={main} onClick={install}>⬇ Install app</button>
        <button type="button" style={close} aria-label="Hide install button" onClick={dismiss}>✕</button>
      </div>
    </>
  );
}