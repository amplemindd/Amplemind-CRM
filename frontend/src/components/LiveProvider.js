import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import { getSession } from '../auth';
import { chime, desktopNotify, startRing, unlockAudio } from '../sound';
import { useAuth } from './AuthContext';
import { useUI } from './UI';
import './call.css';

// Live alerts (toast + sound + desktop notification) aur voice / video calling (WebRTC). Shell isse poore portal ko wrap karta hai.
// Chat me call button:
//   const { startCall } = useLive();
//   startCall({ employee_id, name })               -> voice call
//   startCall({ employee_id, name, video: true })  -> video call

const RING_SECONDS = 30;       // call itne second ring hogi, phir apne aap cut
const ALERT_EVERY = 3000;      // kitne ms me naye alert / incoming call dekhna hai
const GATHER_MS = 4000;        // ICE candidates (TURN relay samet) ke liye max wait
const STUN = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
// Optional: frontend .env me bhi TURN de sakte ho (REACT_APP_TURN_URL, REACT_APP_TURN_USER, REACT_APP_TURN_PASS).
// Behtar tareeka: backend .env me TURN_URL / TURN_USERNAME / TURN_PASSWORD (ya TURN_CREDENTIALS_URL) - wahi /api/live/ice se aata hai.
const ENV_TURN = process.env.REACT_APP_TURN_URL
  ? [{ urls: process.env.REACT_APP_TURN_URL.split(',').map(s => s.trim()).filter(Boolean), username: process.env.REACT_APP_TURN_USER, credential: process.env.REACT_APP_TURN_PASS }]
  : [];
const FALLBACK_ICE = { iceServers: [...STUN, ...ENV_TURN] };
const VIDEO_CONSTRAINTS = { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } };

const Ctx = createContext({ startCall: () => {}, inCall: false });
export const useLive = () => useContext(Ctx);

export const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
  </svg>
);
export const VideoIcon = ({ off }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />{off && <path d="M3 3l18 18" />}
  </svg>
);
const MicIcon = ({ off }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0M12 19v3M8 22h8" />{off && <path d="M3 3l18 18" />}
  </svg>
);

const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// Offer me video line ho to ye video call hai
const offerHasVideo = offer => { try { return /m=video /.test(JSON.parse(offer).sdp || ''); } catch (e) { return false; } };

// ICE candidates jama hone tak ruko (ya max GATHER_MS)
const gathered = pc => new Promise(res => {
  if (pc.iceGatheringState === 'complete') return res();
  let t;
  const done = () => { pc.removeEventListener('icegatheringstatechange', chk); clearTimeout(t); res(); };
  const chk = () => pc.iceGatheringState === 'complete' && done();
  t = setTimeout(done, GATHER_MS);
  pc.addEventListener('icegatheringstatechange', chk);
});

const errText = (e, video) => (e && (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError')
  ? (video ? 'Please allow microphone and camera access to make video calls' : 'Please allow microphone access to make calls')
  : e && e.name === 'NotFoundError' ? (video ? 'No camera or microphone found on this device' : 'No microphone found on this device') : (e && e.message) || 'Call failed');

export function LiveProvider({ children }) {
  const ui = useUI();
  const { user } = useAuth();
  const [call, setCall] = useState(null);         // chalti / lag rahi call: { dir, name, phase: connecting|ringing|active, muted, video, hasCam, camOff }
  const [incoming, setIncoming] = useState(null); // aane wali call: { id, from_name, offer, age, video }
  const [secs, setSecs] = useState(0);
  const [link, setLink] = useState('new');       // audio/video ka asli connection: new | connecting | connected | failed
  const [remoteVideo, setRemoteVideo] = useState(false); // samne wale ki video aa rahi hai?
  const remoteEl = useRef(null);                  // samne wale ki awaaz + video (voice call me chhupa rehta hai, par awaaz yahi se aati hai)
  const localEl = useRef(null);                   // apni camera preview
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
    R.remote = null;
    if (remoteEl.current) remoteEl.current.srcObject = null;
    if (localEl.current) localEl.current.srcObject = null;
    R.callId = null; R.dir = null; R.answered = false; R.busy = false;
    setCall(null); setSecs(0); setLink('new'); setRemoteVideo(false);
  }, [R]); // eslint-disable-line react-hooks/exhaustive-deps

  const startClock = () => {
    const t0 = Date.now(); clearInterval(R.clock);
    R.clock = setInterval(() => setSecs(Math.floor((Date.now() - t0) / 1000)), 1000);
  };

  // STUN + TURN servers (backend /api/live/ice se aate hain, 20 min cache)
  const getIce = async () => {
    if (R.ice && Date.now() - R.iceAt < 20 * 60 * 1000) return R.ice;
    try {
      const r = await api('GET', 'live/ice');
      const list = Array.isArray(r.iceServers) && r.iceServers.length ? r.iceServers : STUN;
      R.ice = { iceServers: [...list, ...ENV_TURN] };
      R.hasTurn = !!r.turn || ENV_TURN.length > 0;
    } catch (e) { R.ice = FALLBACK_ICE; R.hasTurn = ENV_TURN.length > 0; }
    R.iceAt = Date.now();
    return R.ice;
  };

  // Mic (+ camera) + peer connection. wantVideo = video call
  const makePc = async wantVideo => {
    if (!navigator.mediaDevices || !window.RTCPeerConnection) throw new Error('Calling needs a modern browser on https');
    const audio = { echoCancellation: true, noiseSuppression: true };
    let stream;
    if (wantVideo) {
      try { stream = await navigator.mediaDevices.getUserMedia({ audio, video: VIDEO_CONSTRAINTS }); }
      catch (e) {
        if (R.dir === 'out') throw e;               // call karne wale ko camera zaroori hai
        stream = await navigator.mediaDevices.getUserMedia({ audio, video: false }); // call lene wala bina camera ke bhi jud sakta hai
        ui.toast('Camera not available. Joining without your video.');
      }
    } else stream = await navigator.mediaDevices.getUserMedia({ audio, video: false });

    const pc = new RTCPeerConnection(await getIce());
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
    pc.ontrack = e => {
      const rs = R.remote || (R.remote = new MediaStream());
      if (!rs.getTracks().includes(e.track)) rs.addTrack(e.track);
      if (e.track.kind === 'video') {
        const upd = () => setRemoteVideo(!e.track.muted);
        e.track.onmute = upd; e.track.onunmute = upd; upd();
      }
      const el = remoteEl.current;
      if (el) { if (el.srcObject !== rs) el.srcObject = rs; el.play().catch(() => {}); }
    };
    setLink('new');
    pc.onconnectionstatechange = () => {
      setLink(pc.connectionState);
      // Audio / video na jude to bhi call apne aap nahi kat'ti. Sirf End dabane par (ya samne wale ke kaatne par) band hoti hai.
      if (pc.connectionState === 'failed') ui.toast(R.hasTurn ? 'Call is not connected. Check the network, or end the call and try again.' : 'Call could not connect on this network. A TURN server is needed.', 'err');
    };
    R.pc = pc; R.stream = stream;
    const hasCam = stream.getVideoTracks().length > 0;
    if (localEl.current && hasCam) localEl.current.srcObject = stream;
    setCall(x => x && { ...x, hasCam, camOff: false });
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

  // target = { employee_id, name, video }
  const startCall = useCallback(async target => {
    if (R.busy) return ui.toast('You are already on a call', 'err');
    const video = !!target.video;
    R.busy = true; R.dir = 'out';
    setCall({ dir: 'out', name: target.name, phase: 'connecting', muted: false, video, hasCam: false, camOff: false });
    try {
      const pc = await makePc(video);
      await pc.setLocalDescription(await pc.createOffer());
      await gathered(pc);
      const r = await api('POST', 'live/calls', { employee_id: target.employee_id, offer: JSON.stringify(pc.localDescription) });
      R.callId = r.id;
      setCall(x => x && { ...x, phase: 'ringing' });
      R.stopRing = startRing('back');
      R.ringTimer = setTimeout(async () => { // 30 sec me na uthe to auto cut (par usi pal utha li ho to nahi)
        try { const c = await api('GET', `live/calls/${R.callId}?got=1`); if (c.status === 'active') return; } catch (e) { /* ignore */ }
        if (R.answered || !R.callId) return;
        ui.toast('No answer'); hangup();
      }, RING_SECONDS * 1000);
      R.poll = setInterval(pollCall, 1000);
    } catch (e) { cleanup(); ui.toast(errText(e, video), 'err'); }
  }, [R, ui, cleanup, hangup, pollCall]); // eslint-disable-line react-hooks/exhaustive-deps

  const accept = async () => {
    const inc = incoming; if (!inc || R.busy) return;
    if (R.stopIn) { R.stopIn(); R.stopIn = null; }
    setIncoming(null); R.inc = null;
    const video = !!inc.video;
    R.busy = true; R.dir = 'in'; R.callId = inc.id;
    setCall({ dir: 'in', name: inc.from_name, phase: 'connecting', muted: false, video, hasCam: false, camOff: false });
    try {
      const pc = await makePc(video);
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
      cleanup(); ui.toast(gone ? 'This call was already answered or ended' : errText(e, video), 'err');
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
  const toggleCam = () => {
    setCall(c => {
      if (!c || !c.hasCam) return c;
      const camOff = !c.camOff;
      if (R.stream) R.stream.getVideoTracks().forEach(t => { t.enabled = !camOff; });
      return { ...c, camOff };
    });
  };

  // Call box me apni camera preview lagane ka stable ref (box baad me khule to bhi stream laga do)
  const setLocal = useCallback(el => {
    localEl.current = el;
    if (el && R.stream && R.stream.getVideoTracks().length) el.srcObject = R.stream;
  }, [R]);

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
            const video = offerHasVideo(inc.offer);
            R.inc = inc; setIncoming({ ...inc, video });
            if (R.stopIn) R.stopIn();
            R.stopIn = startRing('in');
            desktopNotify(video ? 'Incoming video call' : 'Incoming call', `${inc.from_name} is calling you`, 'crm-call');
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

  useEffect(() => { // tab band hone par call ka end signal bhej do (taaki samne wale ki call atki na rahe)
    const bye = () => {
      const sess = getSession();
      if (!R.callId || !sess || !sess.token) return;
      try { fetch(`/api/live/calls/${R.callId}/end`, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + sess.token }, body: '{}' }); } catch (e) { /* ignore */ }
    };
    window.addEventListener('pagehide', bye);
    return () => window.removeEventListener('pagehide', bye);
  }, [R]);

  useEffect(() => () => { const id = R.callId; cleanup(); if (id) api('POST', `live/calls/${id}/end`).catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo(() => ({ startCall, inCall: !!call }), [startCall, call]);
  const initial = n => String(n || '?')[0].toUpperCase();

  const statusText = () => {
    if (!call) return '';
    if (call.phase === 'connecting') return 'Connecting…';
    if (call.phase === 'ringing') return 'Ringing…';
    if (link === 'connected') return mmss(secs);
    if (link === 'disconnected') return 'Reconnecting…';
    if (link === 'failed') return call.video ? 'Video not connected' : 'Audio not connected';
    return call.video ? 'Connecting video…' : 'Connecting audio…';
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      {incoming && !call && (
        <div className="callbox incoming" role="alertdialog" aria-label={incoming.video ? 'Incoming video call' : 'Incoming call'}>
          <div className="cav">{initial(incoming.from_name)}</div>
          <b>{incoming.from_name}</b><span className="cst">{incoming.video ? 'Incoming video call…' : 'Incoming voice call…'}</span>
          <div className="cbtns">
            <div className="cwrap"><button type="button" className="cb red" aria-label="Decline" onClick={decline}><PhoneIcon /></button><span className="clbl">Decline</span></div>
            <div className="cwrap"><button type="button" className="cb green" aria-label="Accept" autoFocus onClick={accept}>{incoming.video ? <VideoIcon /> : <PhoneIcon />}</button><span className="clbl">Accept</span></div>
          </div>
        </div>
      )}
      {call && (
        <div className={'callbox ' + call.phase + (call.video ? ' video' : '')} role="dialog" aria-label={call.video ? 'Video call' : 'Voice call'}>
          {/* Samne wale ki awaaz (aur video) yahi element chalata hai. Voice call me ye chhupa rehta hai par awaaz aati hai. */}
          <div className={'cstage' + (call.video ? '' : ' none')}>
            <video ref={remoteEl} className={'cremote' + (call.video && remoteVideo ? ' show' : '')} autoPlay playsInline />
            {call.video && !remoteVideo && <div className="cav">{initial(call.name)}</div>}
            {call.video && <div className="cinfo"><b>{call.name}</b><span className="cst">{statusText()}</span></div>}
            {call.video && call.hasCam && <video ref={setLocal} className={'clocal' + (call.camOff ? ' off' : '')} autoPlay playsInline muted />}
          </div>
          {!call.video && (
            <>
              <div className="cav">{initial(call.name)}</div>
              <b>{call.name}</b>
              <span className="cst">{statusText()}</span>
            </>
          )}
          <div className="cbtns">
            <div className="cwrap"><button type="button" className={'cb ' + (call.muted ? 'on' : '')} aria-label={call.muted ? 'Unmute' : 'Mute'} onClick={toggleMute}><MicIcon off={call.muted} /></button><span className="clbl">{call.muted ? 'Unmute' : 'Mute'}</span></div>
            {call.video && call.hasCam && (
              <div className="cwrap"><button type="button" className={'cb ' + (call.camOff ? 'on' : '')} aria-label={call.camOff ? 'Turn camera on' : 'Turn camera off'} onClick={toggleCam}><VideoIcon off={call.camOff} /></button><span className="clbl">{call.camOff ? 'Camera on' : 'Camera off'}</span></div>
            )}
            <div className="cwrap"><button type="button" className="cb red" aria-label="End call" onClick={hangup}><PhoneIcon /></button><span className="clbl">End</span></div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}