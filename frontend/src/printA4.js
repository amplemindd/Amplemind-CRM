import { COMPANY } from './config';
import { CONTACT, LOGO } from './brand';
import { calcQuote, itemsOf } from './quote';
import { fmtDate, fmtMonth, inr } from './utils';

const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nl = v => esc(v).replace(/\n/g, '<br>');

const CSS = `
  @page{size:A4 portrait;margin:14mm}
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  html,body{margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;color:#1c2333;font-size:12.5px;line-height:1.5}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #2557d6;padding-bottom:12px;margin-bottom:16px}
  .head h1{margin:0;font-size:23px;color:#2557d6;letter-spacing:.4px}.head small{color:#637085}
  .doc{text-align:right}.doc h2{margin:0;font-size:21px;letter-spacing:2px}
  .meta{display:flex;gap:14px;margin-bottom:16px}
  .box{flex:1;border:1px solid #d9dee7;border-radius:6px;padding:9px 12px}
  .box h4{margin:0 0 5px;font-size:10.5px;color:#637085;text-transform:uppercase;letter-spacing:.06em}
  table{width:100%;border-collapse:collapse}
  th{background:#eef2fb;text-align:left;font-size:11.5px;padding:8px 9px;border:1px solid #d9dee7}
  td{padding:8px 9px;border:1px solid #d9dee7;vertical-align:top}
  td small{display:block;color:#637085;font-size:11px}
  .r{text-align:right}.c{text-align:center}
  tr{page-break-inside:avoid}
  .tot{width:46%;margin:12px 0 0 auto}.tot td{border:0;border-bottom:1px solid #e6e9ef;padding:6px 4px}
  .tot .g td{font-size:15px;font-weight:700;background:#f2f6ff;border-bottom:2px solid #2557d6}
  .terms{margin-top:18px}.terms h4,.notes h4{margin:0 0 5px;font-size:11px;text-transform:uppercase;color:#637085}.terms li{margin-bottom:2px}
  .notes{margin-top:14px}
  .sign{margin-top:64px;display:flex;justify-content:space-between}.sign div{width:190px;border-top:1px solid #1c2333;padding-top:6px;text-align:center;font-size:12px}
  .foot{margin-top:26px;text-align:center;color:#8a95a8;font-size:10.5px}
  .big{font-size:28px;font-weight:700;color:#0f7a4d;margin:6px 0}
  .two{display:flex;gap:14px;margin-top:14px}.two>div{flex:1}
  .net{margin-top:14px;background:#e9f7ef;border:1px solid #bfe6d0;border-radius:6px;padding:11px 14px;display:flex;justify-content:space-between;font-size:16px;font-weight:700}
`;

// Kisi bhi HTML ko A4 page par print karta hai. title = PDF ka file name bhi banta hai ("Save as PDF" me)
export const printA4 = (html, title = 'Document', css = CSS) => {
  const w = window.open('', '_blank');
  if (!w) return alert('Please allow pop-ups for this site to print.');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>${css}</style></head><body>${html}</body></html>`);
  w.document.close();
  w.focus();
  // font aur logo load hone ke baad hi print (max 2.5 sec wait)
  const go = () => { if (!w.__printed) { w.__printed = true; w.print(); } };
  const ready = w.document.fonts && w.document.fonts.ready ? w.document.fonts.ready : Promise.resolve();
  Promise.race([ready, new Promise(r => setTimeout(r, 2500))]).then(() => setTimeout(go, 250));
};

// ---------- Quotation ka design (sample PDF jaisa) ----------
const QCSS = `
  @page{size:A4 portrait;margin:0}
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  html,body{margin:0;padding:0}
  body{font-family:Figtree,Arial,Helvetica,sans-serif;color:#10241d;font-size:12px;line-height:1.5}
  table.pg{width:100%;border-collapse:collapse}.pg>thead td,.pg>tfoot td{padding:0;border:0}
  .sp{height:8mm}.wrap{padding:0 14mm}
  .top{background:#10241d;color:#fff;display:flex;justify-content:space-between;align-items:center;padding:6mm 7mm}
  .top .lg{display:flex;align-items:center;gap:4mm}
  .top .bd{width:17mm;height:17mm;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;flex:none}
  .top .bd img{width:14.5mm;height:14.5mm;display:block}
  .top .nm b{display:block;font-size:25px;font-weight:600;letter-spacing:3px;line-height:1.1;color:#fff}.top .nm b i{font-style:normal;color:#8cc63f}
  .top .nm span{display:block;font-size:10.5px;letter-spacing:3.4px;color:#dfe9e3;margin-top:1.2mm}
  .top .co{text-align:right}.top .co b{display:block;font-size:15px;font-weight:700}.top .co span{font-size:12px;font-weight:400}
  .ttl{display:flex;justify-content:space-between;align-items:flex-start;margin:7mm 0 5mm}
  .ttl h1{margin:0;font-size:26px;font-weight:700;letter-spacing:2.4px;color:#2f7d1f}
  .ttl .m{text-align:right;font-size:12px;line-height:1.6}
  .cl{background:#f2f6f3;border-left:1.2mm solid #5aa02c;padding:3.2mm 6mm;margin-bottom:5mm;line-height:1.6}
  .cl .k{font-size:10.5px;letter-spacing:1.2px;text-transform:uppercase;color:#6b7a72}
  table.it{width:100%;border-collapse:collapse}
  .it th{background:#10241d;color:#fff;font-weight:500;font-size:11.5px;padding:2.6mm 3mm;text-align:left}
  table.it{table-layout:fixed}.it th.r{text-align:right}.it th.c{text-align:center}
  .it td{padding:2.8mm 3mm;vertical-align:top;border-bottom:1px solid #e1e6e3}
  .it tr{page-break-inside:avoid}
  .it small{display:block;color:#6b7a72;font-size:11px;margin-top:.6mm}
  .r{text-align:right}.c{text-align:center}
  table.tt{width:52%;margin:3mm 0 0 auto;border-collapse:collapse;page-break-inside:avoid}
  .tt td{padding:1.4mm 0;font-size:12px}
  .tt .g td{border-top:2px solid #10241d;padding:3mm 0 1mm;font-size:15px;font-weight:700}
  .nt{margin-top:5mm;page-break-inside:avoid}.nt h4{margin:0 0 1.5mm;font-size:12px;font-weight:700}
  .tc{margin-top:4.5mm;page-break-inside:avoid}.tc h4{margin:0 0 1.5mm;font-size:12px;font-weight:700}
  .tc ol{margin:0;padding-left:5.2mm}.tc li{margin-bottom:.9mm;padding-left:.8mm}
  .sg{display:flex;justify-content:space-between;margin-top:10mm;page-break-inside:avoid}
  .sg>div{border-top:2px solid #10241d;padding-top:1.8mm;font-size:12px}.sg small{display:block;color:#6b7a72;font-size:10.5px;margin-top:.8mm}
  .sg .a{width:52mm}.sg .b{width:66mm;text-align:left}
  .ft{background:#10241d;color:#fff;text-align:center;padding:2.2mm 4mm;margin-top:5mm;font-size:12px;line-height:1.55;page-break-inside:avoid}
`;

const header = (label, no, sub) => `<div class="head"><div><h1>${esc(COMPANY)}</h1><small>${esc(sub)}</small></div>
  <div class="doc"><h2>${label}</h2><div>${esc(no || '')}</div></div></div>`;
const kv = (k, v) => (v ? `<tr><td>${esc(k)}</td><td class="r">${esc(v)}</td></tr>` : '');

// ---------- Quotation ----------
export const printQuotation = q => {
  const items = itemsOf(q);
  const gstOn = q.gst_on === undefined || q.gst_on === null ? false : Number(q.gst_on) === 1 || q.gst_on === true;
  const c = calcQuote(items, q.discount_pct, gstOn, q.gst_rate ?? 18);
  const rows = c.lines.map((l, i) => `<tr><td>${i + 1}</td><td><b>${esc(l.name)}</b>${l.desc ? `<small>${esc(l.desc)}</small>` : ''}</td>
    <td class="r">${l.qty}</td><td class="r">${inr(l.rate)}</td><td class="c">${l.disc ? l.disc + '%' : '–'}</td><td class="r">${inr(l.amount)}</td></tr>`).join('')
    || '<tr><td colspan="6" class="c">—</td></tr>';
  const terms = String(q.terms || '').split('\n').map(s => s.trim()).filter(Boolean).map(t => `<li>${esc(t)}</li>`).join('');
  const body = `<div class="wrap">
    <div class="top"><div class="lg"><div class="bd"><img src="${LOGO}" alt="Logo"></div><div class="nm"><b>AMPLE<i>MIND</i></b><span>Technologies.Pvt.Ltd</span></div></div><div class="co"><b>${esc(COMPANY)}</b><span>Contact: ${esc(CONTACT)}</span></div></div>
    <div class="ttl"><h1>QUOTATION</h1>
      <div class="m">Quotation no: <b>${esc(q.no || 'DRAFT')}</b><br>Date: <b>${esc(fmtDate(q.qdate))}</b><br>Valid till: <b>${esc(fmtDate(q.valid_till))}</b></div></div>
    <div class="cl"><div class="k">Quotation for</div><b>${esc(q.client)}</b>${q.contact ? `<br>${esc(q.contact)}` : ''}${q.client_address ? `<br>${nl(q.client_address)}` : ''}${q.client_phone ? `<br>Phone: ${esc(q.client_phone)}` : ''}${q.client_gst ? `<br>GSTIN: ${esc(q.client_gst)}` : ''}</div>
    <table class="it"><colgroup><col style="width:9mm"><col><col style="width:14mm"><col style="width:26mm"><col style="width:18mm"><col style="width:28mm"></colgroup><thead><tr><th>#</th><th>Item and description</th><th class="r">Qty</th><th class="r">Rate</th><th class="c">Disc.</th><th class="r">Amount</th></tr></thead><tbody>${rows}</tbody></table>
    <table class="tt"><tbody>
      <tr><td>Subtotal</td><td class="r">${inr(c.subtotal)}</td></tr>
      ${c.discount ? `<tr><td>Extra discount (${Number(q.discount_pct)}%)</td><td class="r">- ${inr(c.discount)}</td></tr>` : ''}
      ${gstOn ? `<tr><td>GST (${Number(q.gst_rate ?? 18)}%)</td><td class="r">${inr(c.gst)}</td></tr>` : '<tr><td colspan="2" style="font-size:11px;color:#6b7a72">GST extra as applicable</td></tr>'}
      <tr class="g"><td>Total</td><td class="r">${inr(c.total)}</td></tr></tbody></table>
    ${q.notes ? `<div class="nt"><h4>Notes</h4>${nl(q.notes)}</div>` : ''}
    ${terms ? `<div class="tc"><h4>Terms and conditions</h4><ol>${terms}</ol></div>` : ''}
    <div class="sg"><div class="a">Client acceptance<small>Signature and date</small></div><div class="b">For ${esc(COMPANY)}<small>Authorised signatory</small></div></div>
    <div class="ft"><b>${esc(COMPANY)}</b> &nbsp;|&nbsp; Contact: ${esc(CONTACT)}<br>Thank you for your business</div>
  </div>`;
  printA4(`<table class="pg"><thead><tr><td><div class="sp"></div></td></tr></thead><tbody><tr><td>${body}</td></tr></tbody><tfoot><tr><td><div class="sp"></div></td></tr></tfoot></table>`,
    `${q.no || 'Quotation'} - ${q.client || ''}`.trim(), QCSS);
};

// ---------- Payment receipt ----------
export const printReceipt = r => {
  printA4(`${header('RECEIPT', r.receipt_no, 'Payment receipt')}
    <div class="meta">
      <div class="box"><h4>Received from</h4><b style="font-size:14px">${esc(r.client)}</b>${r.phone ? `<br>Phone: ${esc(r.phone)}` : ''}</div>
      <div class="box"><h4>Payment details</h4>Date: <b>${esc(fmtDate(r.paid_on))}</b><br>Mode: <b>${esc(r.method || '—')}</b>${r.reference ? `<br>Reference: ${esc(r.reference)}` : ''}</div>
    </div>
    <table><thead><tr><th>Description</th><th class="r" style="width:150px">Amount</th></tr></thead>
      <tbody><tr><td>${esc(r.for_what || 'Payment')}</td><td class="r">${inr(r.amount)}</td></tr></tbody></table>
    <table class="tot"><tbody><tr class="g"><td>Total received</td><td class="r">${inr(r.amount)}</td></tr></tbody></table>
    <p style="margin-top:18px">Amount received with thanks:</p><div class="big">${inr(r.amount)}</div>
    <div class="sign"><div>Received by</div><div>Authorised signatory</div></div>
    <div class="foot">This is a computer generated receipt. — ${esc(COMPANY)}</div>`, `Receipt ${r.receipt_no}`);
};

// ---------- Salary slip ----------
// Rupees ko words me (Indian system: lakh, crore)
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const below100 = n => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : ''));
const below1000 = n => (n >= 100 ? ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + below100(n % 100) : '') : below100(n));
const rupeesInWords = v => {
  let n = Math.round(Math.abs(Number(v) || 0));
  if (!n) return 'Rupees Zero Only';
  const parts = [];
  [[10000000, 'Crore'], [100000, 'Lakh'], [1000, 'Thousand']].forEach(([d, name]) => { if (n >= d) { parts.push(below1000(Math.floor(n / d)) + ' ' + name); n %= d; } });
  if (n) parts.push(below1000(n));
  return 'Rupees ' + parts.join(' ') + ' Only';
};

const SCSS = QCSS + `
  .sheet{min-height:296mm;padding:10mm 14mm;display:flex;flex-direction:column}
  .sheet .ft{margin-top:auto}
  .emp{background:#f2f6f3;border-left:1.2mm solid #5aa02c;padding:4mm 6mm;margin-bottom:6mm;display:grid;grid-template-columns:repeat(3,1fr);gap:4mm 6mm}
  .emp .k{font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:#6b7a72;margin-bottom:.6mm}
  .emp .v{font-size:13px;font-weight:600}
  .two2{display:flex;gap:6mm;align-items:stretch}
  .two2>.cd{flex:1}
  .cd{border:1px solid #e1e6e3;display:flex;flex-direction:column;page-break-inside:avoid}
  .cd h5{margin:0;background:#10241d;color:#fff;font-size:11.5px;font-weight:500;padding:2.6mm 3mm;display:flex;justify-content:space-between}
  .cd .rw{flex:1}
  .cd .ln{display:flex;justify-content:space-between;padding:3mm;border-bottom:1px solid #e1e6e3;font-size:12.5px}
  .cd .ln:last-child{border-bottom:0}
  .cd .tl{display:flex;justify-content:space-between;padding:3mm;background:#f2f6f3;border-top:2px solid #10241d;font-weight:700;font-size:13px}
  .netbox{margin-top:6mm;background:#10241d;color:#fff;padding:5mm 7mm;display:flex;justify-content:space-between;align-items:center;page-break-inside:avoid}
  .netbox small{display:block;color:#b9c9c0;font-size:11px;margin-top:.8mm}
  .netbox .l{font-size:13px;letter-spacing:1.2px;text-transform:uppercase;font-weight:600}
  .netbox .amt{font-size:28px;font-weight:700;color:#fff}
  .inw{margin-top:3mm;padding:3mm 4mm;border:1px dashed #b8c7be;font-size:12px;color:#2b3b34}.inw b{color:#10241d}
  .att{display:flex;gap:6mm;margin-top:6mm}
  .att>div{flex:1;border:1px solid #e1e6e3;padding:3mm 4mm}.att .k{font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:#6b7a72}.att .v{font-size:16px;font-weight:700;margin-top:.5mm}
  .sheet .sg{margin-top:16mm}
`;

export const printSalarySlip = r => {
  const n = v => Number(v) || 0;
  const earn = n(r.basic) + n(r.hra) + n(r.allowances) + n(r.bonus);
  const net = r.net !== undefined && r.net !== null && r.net !== '' ? n(r.net) : earn - n(r.deductions);
  const present = r.days_present === null || r.days_present === undefined || r.days_present === '' ? null : n(r.days_present);
  const working = r.working_days === null || r.working_days === undefined || r.working_days === '' ? null : n(r.working_days);
  const absent = present !== null && working !== null ? Math.max(0, working - present) : null;
  const month = fmtMonth(r.slip_month);
  const empId = 'EMP-' + String(r.employee_id || '').padStart(3, '0');
  const ln = (k, v) => `<div class="ln"><span>${k}</span><span>${inr(v)}</span></div>`;
  const html = `<div class="sheet">
    <div class="top"><div class="lg"><div class="bd"><img src="${LOGO}" alt="Logo"></div><div class="nm"><b>AMPLE<i>MIND</i></b><span>Technologies.Pvt.Ltd</span></div></div><div class="co"><b>${esc(COMPANY)}</b><span>Contact: ${esc(CONTACT)}</span></div></div>
    <div class="ttl"><h1>SALARY SLIP</h1>
      <div class="m">Pay period: <b>${esc(month)}</b><br>Slip for: <b>${esc(empId)}</b>${r.paid_on ? `<br>Paid on: <b>${esc(fmtDate(r.paid_on))}</b>` : ''}</div></div>
    <div class="emp">
      <div><div class="k">Employee name</div><div class="v">${esc(r.employee || '—')}</div></div>
      <div><div class="k">Employee ID</div><div class="v">${esc(empId)}</div></div>
      <div><div class="k">Designation</div><div class="v">${esc(r.designation || '—')}</div></div>
    </div>
    <div class="two2">
      <div class="cd"><h5><span>Earnings</span><span>Amount</span></h5><div class="rw">${ln('Basic salary', r.basic)}${ln('HRA', r.hra)}${ln('Allowances', r.allowances)}${ln('Bonus', r.bonus)}</div><div class="tl"><span>Total earnings</span><span>${inr(earn)}</span></div></div>
      <div class="cd"><h5><span>Deductions</span><span>Amount</span></h5><div class="rw">${ln('Deductions', r.deductions)}</div><div class="tl"><span>Total deductions</span><span>${inr(r.deductions)}</span></div></div>
    </div>
    <div class="netbox"><div><div class="l">Net salary</div><small>Total earnings − Total deductions</small></div><div class="amt">${inr(net)}</div></div>
    <div class="inw">Amount in words: <b>${esc(rupeesInWords(net))}</b></div>
    <div class="att">
      <div><div class="k">Working days</div><div class="v">${working ?? '—'}</div></div>
      <div><div class="k">Days present</div><div class="v">${present ?? '—'}</div></div>
      <div><div class="k">Days absent</div><div class="v">${absent ?? '—'}</div></div>
    </div>
    ${r.notes ? `<div class="nt"><h4>Notes</h4>${nl(r.notes)}</div>` : ''}
    <div class="sg"><div class="a">Employee signature<small>Signature and date</small></div><div class="b">For ${esc(COMPANY)}<small>Authorised signatory</small></div></div>
    <div class="ft"><b>${esc(COMPANY)}</b> &nbsp;|&nbsp; Contact: ${esc(CONTACT)}<br>This is a computer generated salary slip</div>
  </div>`;
  printA4(html, `Salary slip ${month} - ${r.employee || ''}`.trim(), SCSS);
};