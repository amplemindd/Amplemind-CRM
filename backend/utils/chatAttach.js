// Chat ke attachment (photo / audio / document) ko check karta hai.
// Frontend data-URL (base64) bhejta hai, wahi DB me messages.attach column me save hota hai (photos ki tarah).
const wrap = require('./wrap');

const RULES = {
  image: { re: /^data:image\/(jpeg|png|webp|gif);base64,/i, max: 2.5e6, label: 'Photo' },
  audio: { re: /^data:audio\/[a-z0-9.+-]+(;[a-z0-9=.,+-]+)*;base64,/i, max: 5e6, label: 'Voice message' },
  file:  { re: /^data:[a-z0-9.+\/-]+(;[a-z0-9=.,+-]+)*;base64,/i, max: 5e6, label: 'Document' },
};

// req.body se { attach, attach_type, attach_name } nikalo (attachment nahi hai to sab null)
module.exports = body => {
  const type = body.attach_type, data = body.attach;
  if (!type || !data) return { attach: null, attach_type: null, attach_name: null };
  const r = RULES[type];
  if (!r || typeof data !== 'string' || !r.re.test(data)) throw wrap.err(400, 'This file type is not supported');
  if (data.length > r.max) throw wrap.err(400, `${r.label} is too large`);
  return { attach: data, attach_type: type, attach_name: String(body.attach_name || '').slice(0, 120) || null };
};