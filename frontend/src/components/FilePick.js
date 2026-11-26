import { useRef } from 'react';
import { fileToDataUrl } from '../utils';
import Icon from './Icon';
import { useUI } from './UI';

const MAX_MB = 3;
const EXT = { 'application/pdf': 'pdf', 'application/msword': 'doc', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx', 'image/jpeg': 'jpg', 'image/png': 'png' };

const mimeOf = url => ((String(url || '').match(/^data:([^;,]+)/) || [])[1] || '');
export const kindOf = url => { const m = mimeOf(url); return m.startsWith('image/') ? 'Photo' : m === 'application/pdf' ? 'PDF' : 'Document'; };

// Data URL ko browser me kholo (PDF / photo tab me, Word file download hoti hai)
export const openDataUrl = (url, name = 'document') => {
  try {
    const mime = mimeOf(url) || 'application/octet-stream';
    const bin = atob(String(url).split(',')[1] || '');
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const href = URL.createObjectURL(new Blob([arr], { type: mime }));
    const viewable = mime === 'application/pdf' || mime.startsWith('image/');
    if (viewable && window.open(href, '_blank')) { setTimeout(() => URL.revokeObjectURL(href), 60000); return; }
    const a = document.createElement('a'); a.href = href; a.download = `${name}.${EXT[mime] || 'bin'}`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 60000);
  } catch (e) { /* file kharab hai */ }
};

const readAsDataUrl = file => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(new Error('Could not read this file'));
  r.readAsDataURL(file);
});

// Document chunne ka box: photo (chhoti hokar save hoti hai) ya PDF / Word file (max 3 MB)
export default function FilePick({ value, onChange, label = 'Choose file', id }) {
  const ui = useUI();
  const ref = useRef();
  const pick = async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    try {
      if (/^image\//.test(f.type)) return onChange(await fileToDataUrl(f, 1400, 0.75));
      const ok = f.type === 'application/pdf' || /\.(pdf|docx?)$/i.test(f.name);
      if (!ok) throw new Error('Please choose a photo, PDF or Word file');
      if (f.size > MAX_MB * 1024 * 1024) throw new Error(`File is too large (max ${MAX_MB} MB)`);
      const url = await readAsDataUrl(f);
      onChange(/^data:application\/octet-stream/.test(url) && /\.pdf$/i.test(f.name) ? url.replace('application/octet-stream', 'application/pdf') : url);
    } catch (er) { ui.toast(er.message, 'err'); }
  };
  return (
    <div className="filepick">
      <div className={'fbox ' + (value ? 'has' : '')}>
        {value && mimeOf(value).startsWith('image/') ? <img src={value} alt="Preview" /> : <Icon name="file" />}
        <span className="fname">{value ? `${kindOf(value)} added` : 'No file chosen'}</span>
      </div>
      <div className="fbtns">
        <input ref={ref} id={id} type="file" accept="image/*,application/pdf,.pdf,.doc,.docx" hidden onChange={pick} />
        <button type="button" className="btn sm" onClick={() => ref.current.click()}><Icon name="plus" />{value ? 'Change' : label}</button>
        {value && <button type="button" className="btn sm" onClick={() => openDataUrl(value)}>View</button>}
        {value && <button type="button" className="btn sm" onClick={() => onChange('')}>Remove</button>}
      </div>
    </div>
  );
}
