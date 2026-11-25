// Quotation ka hisaab (backend ke utils/quoteCalc.js jaisa hi)
const n = v => Number(v) || 0;
const r2 = v => Math.round(v * 100) / 100;

export const DEFAULT_TERMS = [
  'This quotation is valid until the date shown above.',
  'All prices are in Indian Rupees (INR). GST is charged extra unless stated otherwise.',
  'Payment terms: 50% advance with the order and the balance on delivery or go-live.',
  'Delivery and setup timelines will be confirmed once the order and requirements are finalised.',
  'Work outside the agreed scope will be quoted and charged separately.',
  'Domain, hosting, SMS, WhatsApp and app store charges are not included unless stated.',
  'Support and maintenance after the first year are available at additional cost.',
].join('\n');

export const blankItem = () => ({ name: '', desc: '', qty: 1, rate: '', disc: 0 });

export const calcQuote = (items = [], discountPct = 0, gstOn = true, gstRate = 18) => {
  const lines = items.filter(i => String(i.name || '').trim() || n(i.rate)).map(i => ({
    name: String(i.name || '').trim(), desc: String(i.desc || '').trim(), qty: n(i.qty) || 1, rate: n(i.rate), disc: n(i.disc),
    amount: r2((n(i.qty) || 1) * n(i.rate) * (1 - n(i.disc) / 100)),
  }));
  const subtotal = r2(lines.reduce((a, l) => a + l.amount, 0));
  const discount = r2(subtotal * n(discountPct) / 100);
  const taxable = r2(subtotal - discount);
  const gst = gstOn ? r2(taxable * n(gstRate) / 100) : 0;
  return { lines, subtotal, discount, taxable, gst, total: r2(taxable + gst) };
};

// Purani quotation (sirf text items) ko items me todta hai: "Item name - 12000"
export const legacyItems = text => String(text || '').split('\n').map(s => s.trim()).filter(Boolean).map(line => {
  const m = line.match(/^(.*?)\s*[-–]\s*₹?\s*([\d,]+(?:\.\d+)?)\s*$/);
  return m ? { name: m[1], desc: '', qty: 1, rate: Number(m[2].replace(/,/g, '')), disc: 0 } : { name: line, desc: '', qty: 1, rate: 0, disc: 0 };
});

// Saved quotation row -> items array
export const itemsOf = q => {
  if (Array.isArray(q.items)) return q.items; // quotation form ke state se
  try { const a = JSON.parse(q.items_json || ''); if (Array.isArray(a) && a.length) return a; } catch (e) { /* purani quotation */ }
  return legacyItems(q.items);
};
