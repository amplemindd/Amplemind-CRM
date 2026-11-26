import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { fileToDataUrl, fmtTime, toDate } from '../utils';
import Icon from './Icon';
import { useUI } from './UI';
import './chatx.css';

const dayLabel = s => {
  const d = toDate(s); if (!d || isNaN(d)) return '';
  const t = new Date(), y = new Date(); y.setDate(t.getDate() - 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  return same(d, t) ? 'Today' : same(d, y) ? 'Yesterday' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const MAX_REC = 180;                 // voice message max 3 minute
const MAX_FILE = 3.5 * 1024 * 1024;  // document / audio file max 3.5 MB
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const readAsDataUrl = f => new Promise((res, rej) => {
  const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('Could not read this file')); r.readAsDataURL(f);
});

// Photo / audio / document list me nahi aate (halka rakhne ke liye). Dikhte waqt ek baar server se aate hain aur yahan cache hote hain.
const cache = new Map();
const getFile = (me, id) => {
  const k = me + ':' + id;
  if (!cache.has(k)) {
    if (cache.size > 40) cache.delete(cache.keys().next().value);
    cache.set(k, api('GET', `${me === 'admin' ? 'messages' : 'my/messages'}/${id}/file`).catch(e => { cache.delete(k); throw e; }));
  }
  return cache.get(k);
};

// Voice message player (WhatsApp jaisa): play/pause + progress + time
function Voice({ src, err, secs }) {
  const au = useRef();
  const [on, setOn] = useState(false), [t, setT] = useState(0), [d, setD] = useState(secs || 0);
  const sync = () => { const a = au.current; if (!a) return; setT(a.currentTime); if (isFinite(a.duration) && a.duration > 0) setD(a.duration); };
  const toggle = () => { const a = au.current; if (!a || !src) return; if (on) a.pause(); else a.play().catch(() => {}); };
  const seek = e => { const a = au.current; if (a && d) a.currentTime = (e.target.value / 1000) * d; };
  return (
    <div className="voice">
      <button type="button" className="vplay" aria-label={on ? 'Pause' : 'Play voice message'} disabled={!src} onClick={toggle}><Icon name={on ? 'pause' : 'play'} /></button>
      <div className="vmid">
        <input type="range" min="0" max="1000" value={d ? Math.min(1000, Math.round((t / d) * 1000)) : 0} onChange={seek} aria-label="Seek" disabled={!src} />
        <small>{err ? 'Unavailable' : on || t > 0 ? mmss(t) : d ? mmss(d) : '0:00'}</small>
      </div>
      <audio ref={au} src={src || undefined} preload="metadata" hidden onLoadedMetadata={sync} onTimeUpdate={sync}
        onPlay={() => setOn(true)} onPause={() => setOn(false)} onEnded={() => { setOn(false); setT(0); }} />
    </div>
  );
}

// Message ke andar photo / audio / document
function Att({ m, me, onOpen, onMedia }) {
  const [f, setF] = useState(null), [err, setErr] = useState(false);
  const auto = m.attach_type !== 'file';
  useEffect(() => {
    if (!auto) return undefined;
    let ok = true;
    getFile(me, m.id).then(r => ok && setF(r)).catch(() => ok && setErr(true));
    return () => { ok = false; };
  }, [m.id, me, auto]);
  const download = async () => {
    try {
      const r = await getFile(me, m.id);
      const a = document.createElement('a'); a.href = r.data; a.download = r.name || 'document'; document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { setErr(true); }
  };
  if (m.attach_type === 'image') {
    return f ? <img className="att-img" src={f.data} alt="Shared" onLoad={onMedia} onClick={() => onOpen(f.data)} />
      : <div className="att-ph">{err ? 'Photo unavailable' : <Icon name="image" />}</div>;
  }
  if (m.attach_type === 'audio') return <Voice src={f && f.data} err={err} secs={Number(m.attach_name) || 0} />;
  return (
    <button type="button" className="att-doc" onClick={download}>
      <Icon name="file" /><span>{m.attach_name || 'Document'}</span><Icon name="download" />
    </button>
  );
}

// Camera (laptop / mobile). Chal na paye to phone ka camera app khulta hai.
function Camera({ onShot, onClose, onFallback }) {
  const vid = useRef(), stream = useRef(), fb = useRef(onFallback);
  fb.current = onFallback;
  const [face, setFace] = useState('environment');
  useEffect(() => {
    let dead = false;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { fb.current(); return undefined; }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: face }, audio: false }).then(s => {
      if (dead) { s.getTracks().forEach(t => t.stop()); return; }
      stream.current = s; if (vid.current) vid.current.srcObject = s;
    }).catch(() => { if (!dead) fb.current(); });
    return () => { dead = true; if (stream.current) { stream.current.getTracks().forEach(t => t.stop()); stream.current = null; } };
  }, [face]);
  useEffect(() => {
    const k = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  const shot = () => {
    const v = vid.current; if (!v || !v.videoWidth) return;
    const k = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement('canvas'); c.width = Math.round(v.videoWidth * k); c.height = Math.round(v.videoHeight * k);
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    onShot(c.toDataURL('image/jpeg', 0.82));
  };
  return (
    <div className="wa-cam" role="dialog" aria-modal="true" aria-label="Camera">
      <video ref={vid} autoPlay playsInline muted className={face === 'user' ? 'mirror' : ''} />
      <div className="wa-camctl">
        <button type="button" className="cbtn" aria-label="Close camera" onClick={onClose}><Icon name="x" /></button>
        <button type="button" className="shutter" aria-label="Take photo" onClick={shot} />
        <button type="button" className="cbtn" aria-label="Switch camera" onClick={() => setFace(f => (f === 'user' ? 'environment' : 'user'))}><Icon name="flip" /></button>
      </div>
    </div>
  );
}

// WhatsApp jaisi chat. load() messages laata hai, send(text, extra) bhejta hai.
// me = 'admin' ya 'employee' (apne messages right side me)
// attach = true par gallery / camera / audio / document ke buttons aate hain. fill = parent ki poori height lo.
export default function Chat({ load, send, me, height = 340, placeholder = 'Type a message', empty = 'No messages yet. Say hello!', attach = false, fill = false }) {
  const ui = useUI();
  const [msgs, setMsgs] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [pend, setPend] = useState(null);       // bhejne se pehle chuni hui photo / file
  const [menu, setMenu] = useState(false);      // + (clip) menu
  const [cam, setCam] = useState(false);
  const [big, setBig] = useState(null);         // photo bada dekhna
  const [recSecs, setRecSecs] = useState(null); // null = record nahi ho raha
  const box = useRef(), loadRef = useRef(load), count = useRef(0), stick = useRef(true);
  const gal = useRef(), camIn = useRef(), docIn = useRef(), audIn = useRef();
  const rec = useRef(null), submitRef = useRef(null);
  loadRef.current = load;

  const refresh = useCallback(() => loadRef.current().then(setMsgs).catch(() => {}), []);
  useEffect(() => {
    refresh();
    const t = setInterval(() => { if (!document.hidden) refresh(); }, 5000); // har 5 sec me naye message
    return () => clearInterval(t);
  }, [refresh]);

  const toBottom = () => { if (box.current) box.current.scrollTop = box.current.scrollHeight; };
  const onScroll = () => { const b = box.current; if (b) stick.current = b.scrollHeight - b.scrollTop - b.clientHeight < 90; };
  const onMedia = () => { if (stick.current) toBottom(); }; // photo load hone ke baad bhi neeche rahe
  useEffect(() => { // naya message aane par neeche scroll
    if (msgs && msgs.length !== count.current) { toBottom(); count.current = msgs.length; stick.current = true; }
  }, [msgs]);

  // Chat band hote hi recording / mic band
  useEffect(() => () => {
    const r = rec.current;
    if (r) { r.cancel = true; clearInterval(r.timer); if (r.mr.state !== 'inactive') r.mr.stop(); r.stream.getTracks().forEach(t => t.stop()); }
  }, []);

  // ---- bhejna (text, photo, audio, document sab yahin se) ----
  const submit = async (att, bodyText) => {
    const body = (bodyText === undefined ? text : bodyText).trim();
    const a = att || pend;
    if ((!body && !a) || busy) return;
    setBusy(true);
    try {
      await send(body, a ? { attach: a.data, attach_type: a.type, attach_name: a.name } : {});
      if (bodyText === undefined) setText('');
      setPend(null); setMenu(false);
      await refresh();
    } catch (e) { ui.toast(e.message, 'err'); }
    setBusy(false);
  };
  submitRef.current = submit;

  // ---- gallery / camera / document / audio file chunna ----
  const pickImage = async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = ''; setMenu(false);
    if (!f) return;
    try { setPend({ type: 'image', data: await fileToDataUrl(f, 1280, 0.8), name: f.name || 'photo.jpg' }); } catch (er) { ui.toast(er.message, 'err'); }
  };
  const pickDoc = async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = ''; setMenu(false);
    if (!f) return;
    if (f.size > MAX_FILE) return ui.toast('File is too large (max 3.5 MB)', 'err');
    try { setPend({ type: 'file', data: await readAsDataUrl(f), name: f.name }); } catch (er) { ui.toast(er.message, 'err'); }
  };
  const pickAudio = async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = ''; setMenu(false);
    if (!f) return;
    if (f.size > MAX_FILE) return ui.toast('Audio file is too large (max 3.5 MB)', 'err');
    try {
      const data = await readAsDataUrl(f);
      const secs = await new Promise(res => { const a = new Audio(); a.preload = 'metadata'; a.onloadedmetadata = () => res(isFinite(a.duration) ? Math.round(a.duration) : 0); a.onerror = () => res(0); a.src = data; });
      setPend({ type: 'audio', data, name: String(secs) });
    } catch (er) { ui.toast(er.message, 'err'); }
  };
  const openCamera = () => { setMenu(false); setCam(true); };

  // ---- voice message record karna ----
  const startRec = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      return ui.toast('Voice recording is not supported here. Open the site on https.', 'err');
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(t => window.MediaRecorder.isTypeSupported(t));
      const mr = new window.MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined);
      const chunks = [];
      const r = { mr, stream, cancel: false, secs: 0, timer: null };
      mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      mr.onstop = async () => {
        clearInterval(r.timer); stream.getTracks().forEach(t => t.stop()); rec.current = null; setRecSecs(null);
        if (r.cancel || !chunks.length) return;
        const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
        try { submitRef.current({ type: 'audio', data: await readAsDataUrl(blob), name: String(Math.max(1, r.secs)) }, ''); } catch (e) { ui.toast(e.message, 'err'); }
      };
      r.timer = setInterval(() => { r.secs += 1; setRecSecs(r.secs); if (r.secs >= MAX_REC && mr.state !== 'inactive') mr.stop(); }, 1000);
      rec.current = r; setRecSecs(0); mr.start();
    } catch (e) { ui.toast('Microphone permission is needed to record', 'err'); }
  };
  const stopRec = ok => { const r = rec.current; if (!r) return; r.cancel = !ok; if (r.mr.state !== 'inactive') r.mr.stop(); };

  const typing = text.trim().length > 0;
  let lastDay = '';
  // Ek jaise lagatar system messages (jaise "marked as completed") ek hi baar dikhao, count ke saath
  const shown = [];
  (msgs || []).forEach(m => {
    const prev = shown[shown.length - 1];
    if (m.sender === 'system' && prev && prev.sender === 'system' && prev.body === m.body && dayLabel(prev.created_at) === dayLabel(m.created_at)) { prev.n += 1; prev.created_at = m.created_at; return; }
    shown.push({ ...m, n: 1 });
  });
  return (
    <div className={'chat' + (fill ? ' fill' : '')}>
      <div className="chat-box" ref={box} onScroll={onScroll} style={fill ? undefined : { height }}>
        {msgs === null ? <p className="muted c">Loading…</p> : msgs.length === 0 ? <p className="muted c" style={{ margin: 'auto' }}>{empty}</p> : shown.map(m => {
          const day = dayLabel(m.created_at), head = day !== lastDay ? day : ''; lastDay = day;
          const mine = m.sender === me, read = me === 'admin' ? m.read_employee : m.read_admin;
          return (
            <div key={m.id} style={{ display: 'contents' }}>
              {head && <div className="chat-day"><span>{head}</span></div>}
              {m.sender === 'system' ? <div className="chat-sys"><span>{m.body}{m.n > 1 && <b className="sysn"> ×{m.n}</b>}<small className="syst">{fmtTime(m.created_at)}</small></span></div> : (
                <div className={'bub ' + (mine ? 'me' : 'them') + (m.attach_type ? ' has-att' : '')}>
                  {!mine && <b className="who">{m.sender_name}</b>}
                  {m.attach_type && <Att m={m} me={me} onOpen={setBig} onMedia={onMedia} />}
                  {m.body && <p>{m.body}</p>}
                  <span className="meta">{fmtTime(m.created_at)}{mine && <i className={'tick ' + (read ? 'seen' : '')} title={read ? 'Seen' : 'Sent'}>{read ? '✓✓' : '✓'}</i>}</span>
                </div>)}
            </div>);
        })}
      </div>

      {menu && <div className="wa-scrim" onClick={() => setMenu(false)} />}
      {menu && (
        <div className="wa-menu" role="menu">
          <button type="button" role="menuitem" onClick={() => gal.current.click()}><span style={{ background: '#5d42c0' }}><Icon name="image" /></span>Gallery</button>
          <button type="button" role="menuitem" onClick={openCamera}><span style={{ background: '#d6336c' }}><Icon name="camera" /></span>Camera</button>
          <button type="button" role="menuitem" onClick={() => audIn.current.click()}><span style={{ background: '#e8590c' }}><Icon name="mic" /></span>Audio</button>
          <button type="button" role="menuitem" onClick={() => docIn.current.click()}><span style={{ background: '#2557d6' }}><Icon name="file" /></span>Document</button>
        </div>
      )}

      {pend && (
        <div className="wa-pend">
          {pend.type === 'image' ? <img src={pend.data} alt="Selected" />
            : <div className="wa-pdoc"><Icon name={pend.type === 'audio' ? 'mic' : 'file'} /><span>{pend.type === 'audio' ? 'Audio file' : pend.name}</span></div>}
          <button type="button" className="btn icon" aria-label="Remove attachment" onClick={() => setPend(null)}><Icon name="x" /></button>
        </div>
      )}

      {recSecs !== null ? (
        <div className="chat-in wa-rec">
          <button type="button" className="btn icon del" aria-label="Cancel recording" onClick={() => stopRec(false)}><Icon name="trash" /></button>
          <span className="rdot" /><b>{mmss(recSecs)}</b><small>Recording… tap send when done</small>
          <button type="button" className="btn primary icon send" aria-label="Send voice message" onClick={() => stopRec(true)}><Icon name="send" /></button>
        </div>
      ) : (
        <div className="chat-in">
          {attach && <button type="button" className="btn icon wa-clip" aria-label="Attach" aria-expanded={menu} onClick={() => setMenu(m => !m)}><Icon name="clip" /></button>}
          <textarea rows={1} value={text} placeholder={pend ? 'Add a caption…' : placeholder} aria-label="Message" maxLength={2000}
            onChange={e => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 110) + 'px'; }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }} />
          {attach && !typing && !pend && <button type="button" className="btn icon wa-clip" aria-label="Camera" onClick={openCamera}><Icon name="camera" /></button>}
          {attach && !typing && !pend
            ? <button type="button" className="btn primary icon send" aria-label="Record voice message" disabled={busy} onClick={startRec}><Icon name="mic" /></button>
            : <button type="button" className="btn primary icon send" aria-label="Send message" disabled={busy || (!typing && !pend)} onClick={() => submit()}><Icon name="send" /></button>}
        </div>
      )}

      <input ref={gal} type="file" accept="image/*" hidden onChange={pickImage} />
      <input ref={camIn} type="file" accept="image/*" capture="environment" hidden onChange={pickImage} />
      <input ref={audIn} type="file" accept="audio/*" hidden onChange={pickAudio} />
      <input ref={docIn} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip" hidden onChange={pickDoc} />

      {cam && <Camera onClose={() => setCam(false)} onShot={data => { setCam(false); setPend({ type: 'image', data, name: 'camera.jpg' }); }}
        onFallback={() => { setCam(false); if (camIn.current) camIn.current.click(); }} />}
      {big && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Photo" onClick={() => setBig(null)}>
          <img src={big} alt="Full size" />
          <button type="button" className="btn icon" aria-label="Close photo" onClick={() => setBig(null)}><Icon name="x" /></button>
        </div>
      )}
    </div>
  );
}