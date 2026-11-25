import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import { chime, desktopNotify, startRing, unlockAudio } from '../sound';
import { useAuth } from './AuthContext';
import { useUI } from './UI';
import './call.css';

// Live alerts (toast + sound + desktop notification) aur voice calling (WebRTC). Shell isse poore portal ko wrap karta hai.
// Chat me call button: const { startCall } = useLive();  startCall({ employee_id, name })

const RING_SECONDS = 30;       // call itne second ring hogi, phir apne aap cut
const ALERT_EVERY = 3000;      // kitne ms me naye alert / incoming call dekhna hai
const GATHER_MS = 2500;        // ICE candidates ke liye max wait
const ICE = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' },
    // Strict network / mobile data ke liye TURN server (optional). .env me REACT_APP_TURN_URL, REACT_APP_TURN_USER, REACT_APP_TURN_PASS
    ...(process.env.REACT_APP_TURN_URL ? [{ urls: process.env.REACT_APP_TURN_URL, username: process.env.REACT_APP_TURN_USER, credential: process.env.REACT_APP_TURN_PASS }] : []),
  ],
};

const Ctx = createContext({ startCall: () => {}, inCall: false });
export const useLive = () => useContext(Ctx);

export const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
  </svg>
);
const MicIcon = ({ off }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0M12 19v3M8 22h8" />{off && <path d="M3 3l18 18" />}
  </svg>
);

const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// ICE candidates jama hone tak ruko (ya max GATHER_MS)
const gathered = pc => new Promise(res => {
  if (pc.iceGatheringState === 'complete') return res();
  let t;
  const done = () => { pc.removeEventListener('icegatheringstatechange', chk); clearTimeout(t); res(); };
  const chk = () => pc.iceGatheringState === 'complete' && done();
  t = setTimeout(done, GATHER_MS);
  pc.addEventListener('icegatheringstatechange', chk);
});

const errText = e => (e && (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') ? 'Please allow microphone access to make calls'
  : e && e.name === 'NotFoundError' ? 'No microphone found on this device' : (e && e.message) || 'Call failed');

export function LiveProvider({ children }) {
  const ui = useUI();
  const { user } = useAuth();
  const [call, setCall] = useState(null);         // chalti / lag rahi call: { dir, name, phase: connecting|ringing|active, muted }
  const [incoming, setIncoming] = useState(null); // aane wali call: { id, from_name, offer, age }
  const [secs, setSecs] = useState(0);
  const audioEl = useRef(null);
  const R = useRef({}).current;                   // timers, peer connection, call id (re-render ki zaroorat nahi)

  useEffect(() => { unlockAudio(); }, []);

  const stopTimers = () => {
    ['poll', 'ringTimer', 'clock'].forEach(k => { clearInterval(R[k]); clearTimeout(R[k]); R[k] = null; });
    if (R.stopRing) { R.stopRing(); R.stopRing = null; }
  };
  const cleanup = useCallback(() => {
    stopTimers();
    if (R.pc) { try { R.pc.close(); } catch (e) { /* ignore */ } R.pc = null; }
    if (R.stream) { R.stream.getTracks().forEach(t => t.stop()); R.stream = null; }
    if (audioEl.current) audioEl.current.srcObject = null;
    R.callId = null; R.dir = null; R.answered = false; R.busy = false;
    setCall(null); setSecs(0);
  }, [R]); // eslint-disable-line react-hooks/exhaustive-deps

  const startClock = () => {
    const t0 = Date.now(); clearInterval(R.clock);
    R.clock = setInterval(() => setSecs(Math.floor((Date.now() - t0) / 1000)), 1000);
  };

  // Mic + peer connection
  const makePc = async () => {
    if (!navigator.mediaDevices || !window.RTCPeerConnection) throw new Error('Calling needs a modern browser on https');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
    const pc = new RTCPeerConnection(ICE);
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
    pc.ontrack = e => { if (audioEl.current) { audioEl.current.srcObject = e.streams[0]; audioEl.current.play().catch(() => {}); } };
    pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed') { ui.toast('Call connection lost', 'err'); hangup(); } };
    R.pc = pc; R.stream = stream;
    return pc;
  };

  const hangup = useCallback(() => {
    const id = R.callId;
    cleanup();
    if (id) api('POST', `live/calls/${id}/end`).catch(() => {});
  }, [R, cleanup]);

  // Call ka haal dekhte raho (1 sec): answer aaya? samne wale ne kaat di?
  const pollCall = useCallback(async () => {
    if (!R.callId || R.polling) return;
    R.polling = true;
    const id = R.callId;
    try {
      const c = await api('GET', `live/calls/${id}${R.answered ? '?got=1' : ''}`);
      if (R.callId !== id) return;
      if (c.status === 'active') {
        if (R.dir === 'out' && c.answer && !R.answered) {
          R.answered = true;
          if (R.stopRing) { R.stopRing(); R.stopRing = null; }
          clearTimeout(R.ringTimer);
          await R.pc.setRemoteDescription(JSON.parse(c.answer));
          setCall(x => x && { ...x, phase: 'active' }); startClock();
        }
      } else if (c.status !== 'ringing') {
        ui.toast(c.status === 'declined' ? 'Call declined' : c.status === 'ended' ? 'Call ended' : 'No answer');
        cleanup();
      }
    } catch (e) { /* network issue, agli baar */ } finally { R.polling = false; }
  }, [R, cleanup, ui]);

  const startCall = useCallback(async target => {
    if (R.busy) return ui.toast('You are already on a call', 'err');
    R.busy = true; R.dir = 'out';
    setCall({ dir: 'out', name: target.name, phase: 'connecting', muted: false });
    try {
      const pc = await makePc();
      await pc.setLocalDescription(await pc.createOffer());
      await gathered(pc);
      const r = await api('POST', 'live/calls', { employee_id: target.employee_id, offer: JSON.stringify(pc.localDescription) });
      R.callId = r.id;
      setCall(x => x && { ...x, phase: 'ringing' });
      R.stopRing = startRing('back');
      R.ringTimer = setTimeout(() => { ui.toast('No answer'); hangup(); }, RING_SECONDS * 1000); // 30 sec me na uthe to auto cut
      R.poll = setInterval(pollCall, 1000);
    } catch (e) { cleanup(); ui.toast(errText(e), 'err'); }
  }, [R, ui, cleanup, hangup, pollCall]); // eslint-disable-line react-hooks/exhaustive-deps

  const accept = async () => {
    const inc = incoming; if (!inc || R.busy) return;
    if (R.stopIn) { R.stopIn(); R.stopIn = null; }
    setIncoming(null); R.inc = null;
    R.busy = true; R.dir = 'in'; R.callId = inc.id;
    setCall({ dir: 'in', name: inc.from_name, phase: 'connecting', muted: false });
    try {
      const pc = await makePc();
      await pc.setRemoteDescription(JSON.parse(inc.offer));
      await pc.setLocalDescription(await pc.createAnswer());
      await gathered(pc);
      await api('POST', `live/calls/${inc.id}/answer`, { answer: JSON.stringify(pc.localDescription) });
      R.answered = true;
      setCall(x => x && { ...x, phase: 'active' }); startClock();
      R.poll = setInterval(pollCall, 1500);
    } catch (e) {
      const gone = /no longer|already/i.test(e.message || '');
      if (gone) { R.callId = null; }
      cleanup(); ui.toast(gone ? 'This call was already answered or ended' : errText(e), 'err');
      if (!gone) api('POST', `live/calls/${inc.id}/end`).catch(() => {});
    }
  };
  const decline = () => {
    const inc = incoming; if (!inc) return;
    if (R.stopIn) { R.stopIn(); R.stopIn = null; }
    R.inc = null; setIncoming(null);
    api('POST', `live/calls/${inc.id}/end`).catch(() => {});
  };
  const toggleMute = () => {
    setCall(c => {
      if (!c) return c;
      const muted = !c.muted;
      if (R.stream) R.stream.getAudioTracks().forEach(t => { t.enabled = !muted; });
      return { ...c, muted };
    });
  };

  // Har 3 sec: naye alerts (toast + chime) aur incoming call (ring + popup). Tab background me ho tab bhi chalta hai.
  useEffect(() => {
    if (!user) return undefined;
    let stop = false, after = null;
    const tick = async () => {
      try {
        const r = await api('GET', 'live/poll' + (after === null ? '' : `?after=${after}`));
        if (stop) return;
        if (after === null) after = r.last; // pehli baar: purane alerts dobara nahi bajane
        else if (r.alerts.length) {
          r.alerts.forEach(a => { ui.toast(a.body ? `${a.title}: ${a.body}` : a.title); desktopNotify(a.title, a.body, 'crm-' + a.kind); after = Math.max(after, a.id); });
          chime();
        }
        const inc = r.incoming;
        if (inc && !R.busy) {
          if (!R.inc || R.inc.id !== inc.id) {
            R.inc = inc; setIncoming(inc);
            if (R.stopIn) R.stopIn();
            R.stopIn = startRing('in');
            desktopNotify('Incoming call', `${inc.from_name} is calling you`, 'crm-call');
          }
        } else if (R.inc) { // caller ne kaat di / time khatam / kisi aur ne utha li
          if (R.stopIn) { R.stopIn(); R.stopIn = null; }
          R.inc = null; setIncoming(null);
        }
      } catch (e) { /* network issue, agli baar */ }
    };
    tick();
    const t = setInterval(tick, ALERT_EVERY);
    return () => { stop = true; clearInterval(t); if (R.stopIn) { R.stopIn(); R.stopIn = null; } };
  }, [user, ui, R]);

  useEffect(() => () => { const id = R.callId; cleanup(); if (id) api('POST', `live/calls/${id}/end`).catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo(() => ({ startCall, inCall: !!call }), [startCall, call]);
  const initial = n => String(n || '?')[0].toUpperCase();

  return (
    <Ctx.Provider value={value}>
      {children}
      <audio ref={audioEl} autoPlay playsInline hidden />
      {incoming && !call && (
        <div className="callbox incoming" role="alertdialog" aria-label="Incoming call">
          <div className="cav">{initial(incoming.from_name)}</div>
          <b>{incoming.from_name}</b><span className="cst">Incoming voice call…</span>
          <div className="cbtns">
            <div className="cwrap"><button type="button" className="cb red" aria-label="Decline" onClick={decline}><PhoneIcon /></button><span className="clbl">Decline</span></div>
            <div className="cwrap"><button type="button" className="cb green" aria-label="Accept" autoFocus onClick={accept}><PhoneIcon /></button><span className="clbl">Accept</span></div>
          </div>
        </div>
      )}
      {call && (
        <div className={'callbox ' + call.phase} role="dialog" aria-label="Voice call">
          <div className="cav">{initial(call.name)}</div>
          <b>{call.name}</b>
          <span className="cst">{call.phase === 'connecting' ? 'Connecting…' : call.phase === 'ringing' ? 'Ringing…' : mmss(secs)}</span>
          <div className="cbtns">
            <div className="cwrap"><button type="button" className={'cb ' + (call.muted ? 'on' : '')} aria-label={call.muted ? 'Unmute' : 'Mute'} onClick={toggleMute}><MicIcon off={call.muted} /></button><span className="clbl">{call.muted ? 'Unmute' : 'Mute'}</span></div>
            <div className="cwrap"><button type="button" className="cb red" aria-label="End call" onClick={hangup}><PhoneIcon /></button><span className="clbl">End</span></div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}