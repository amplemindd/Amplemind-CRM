export const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN');
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const today = () => ymd(new Date());
export const addDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
export const fmtDate = s => (s ? new Date(s.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const fmtMins = m => (m === null || m === undefined ? '—' : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`);
export const daysFrom = s => Math.round((new Date(s + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 864e5);
export const dueLabel = d => (d < 0 ? `${-d} day${d === -1 ? '' : 's'} overdue` : d === 0 ? 'Today' : `In ${d} day${d === 1 ? '' : 's'}`);
export const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
export const wa = (phone, msg) => {
  let p = (phone || '').replace(/\D/g, ''); if (p.length === 10) p = '91' + p;
  window.open('https://wa.me/' + p + '?text=' + encodeURIComponent(msg));
};
export const printDoc = html => {
  const w = window.open('', '_blank');
  w.document.write('<body style="font-family:Arial;padding:30px">' + html + '</body>'); w.document.close(); w.print();
};
// Field helper: F('name','Label','type',{opts,src,def})
export const F = (name, label, type = 'text', x = {}) => ({ name, label, type, ...x });

// Table data ko Excel/CSV file me download karo
export const csvDownload = (name, head, rows) => {
  const esc = v => { const s = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const text = '\ufeff' + [head, ...rows].map(r => r.map(esc).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  a.download = `${name}-${today()}.csv`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

export const copyText = async text => {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) {
    const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e2) { /* ignore */ } t.remove(); return ok;
  }
};
// Employee ke liye random password
export const genPassword = () => {
  const c = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789', a = new Uint32Array(8); crypto.getRandomValues(a);
  return Array.from(a, n => c[n % c.length]).join('');
};
// Login page ka link (admin ya employee)
export const portalUrl = role => window.location.href.split('#')[0] + '#/' + role + '/login';
// Department ka login link (e.g. HR -> .../#/login/hr)
export const deptUrl = slug => window.location.origin + '/#/login/' + slug;
export const fmtMonth = m => (m ? new Date(m + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—');

// Salary slip ka print HTML (admin, HR aur employee teeno use karte hain)
export const salarySlipHtml = (r, company) => {
  const n = v => '₹' + Number(v || 0).toLocaleString('en-IN');
  const row = (a, b) => `<tr><td style="padding:7px 10px;border:1px solid #ccd">${a}</td><td style="padding:7px 10px;border:1px solid #ccd;text-align:right">${b}</td></tr>`;
  const earn = Number(r.basic || 0) + Number(r.hra || 0) + Number(r.allowances || 0) + Number(r.bonus || 0);
  return `<div style="max-width:720px;margin:auto">
    <h2 style="margin:0">${company}</h2><div style="color:#555;margin-bottom:14px">Salary slip for ${fmtMonth(r.slip_month)}</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:14px">
      ${row('Employee', r.employee || '')}${row('Employee ID', 'EMP-' + String(r.employee_id || '').padStart(3, '0'))}${row('Designation', r.designation || '—')}
      ${row('Days present / working days', `${r.days_present ?? '—'} / ${r.working_days ?? '—'}`)}
    </table>
    <table style="width:100%;border-collapse:collapse">
      <tr style="background:#eef"><th style="padding:7px 10px;border:1px solid #ccd;text-align:left">Earnings</th><th style="padding:7px 10px;border:1px solid #ccd;text-align:right">Amount</th></tr>
      ${row('Basic', n(r.basic))}${row('HRA', n(r.hra))}${row('Allowances', n(r.allowances))}${row('Bonus', n(r.bonus))}
      ${row('<b>Total earnings</b>', '<b>' + n(earn) + '</b>')}
      <tr style="background:#eef"><th style="padding:7px 10px;border:1px solid #ccd;text-align:left">Deductions</th><th style="padding:7px 10px;border:1px solid #ccd;text-align:right"></th></tr>
      ${row('Deductions', n(r.deductions))}
      ${row('<b>Net salary</b>', '<b>' + n(r.net) + '</b>')}
    </table>
    ${r.paid_on ? `<p>Paid on: ${fmtDate(r.paid_on)}</p>` : ''}${r.notes ? `<p>Note: ${r.notes}</p>` : ''}
    <p style="color:#777;font-size:12px;margin-top:30px">This is a computer generated salary slip.</p></div>`;
};

// Status / stage ko rang dene ke liye
const TONES = { lead: 'gray', contacted: 'blue', quotation: 'amber', negotiation: 'violet', customer: 'green', lost: 'red',
  draft: 'gray', sent: 'blue', accepted: 'green', rejected: 'red', pending: 'amber', 'partly paid': 'blue', paid: 'green',
  open: 'amber', 'in progress': 'blue', done: 'green', active: 'green', inactive: 'gray', hot: 'red', warm: 'amber', cold: 'blue',
  high: 'red', medium: 'amber', low: 'gray', present: 'green', absent: 'red', enabled: 'green', disabled: 'gray' };
export const tone = v => TONES[String(v || '').toLowerCase()] || 'gray';

// ---------- Chat / photo helpers ----------
// "2026-11-24 10:42:00" -> Date
export const toDate = s => (s ? new Date(String(s).replace(' ', 'T')) : null);
export const fmtTime = s => { const d = toDate(s); return d && !isNaN(d) ? d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }) : '—'; };
export const fmtDateTime = s => { const d = toDate(s); return d && !isNaN(d) ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + fmtTime(s) : '—'; };
export const timeAgo = s => {
  const d = toDate(s); if (!d || isNaN(d)) return '';
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  if (m < 1) return 'just now'; if (m < 60) return m + ' min ago';
  const h = Math.round(m / 60); if (h < 24) return h + ' hr ago';
  return Math.round(h / 24) + ' day' + (Math.round(h / 24) > 1 ? 's' : '') + ' ago';
};
// Image file ko chhota karke JPEG data URL banata hai (photo DB me save karne ke liye)
export const fileToDataUrl = (file, maxPx = 400, quality = 0.82) => new Promise((resolve, reject) => {
  if (!file || !/^image\//.test(file.type)) return reject(new Error('Please choose an image file'));
  if (file.size > 12 * 1024 * 1024) return reject(new Error('Image is too large (max 12 MB)'));
  const img = new Image(), url = URL.createObjectURL(file);
  img.onload = () => {
    const k = Math.min(1, maxPx / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', quality));
  };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read this image')); };
  img.src = url;
});