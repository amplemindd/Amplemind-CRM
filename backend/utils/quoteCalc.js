// Quotation ka hisaab (frontend aur backend dono ka formula ek hi hai)
const n = v => Number(v) || 0;
const r2 = v => Math.round(v * 100) / 100;

module.exports = function calcQuote(items = [], discountPct = 0, gstOn = true, gstRate = 18) {
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
