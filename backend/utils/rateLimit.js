// Login par galat password baar baar daalne se rokta hai (6 galat try = 10 minute block)
const hits = new Map();
const MAX = 6, WINDOW = 10 * 60 * 1000;
const key = (req, u) => (req.ip || '') + '|' + u;
const live = k => { const h = hits.get(k); if (h && Date.now() - h.t >= WINDOW) { hits.delete(k); return null; } return h || null; };

exports.check = (req, u) => {
  const h = live(key(req, u));
  if (h && h.n >= MAX) throw Object.assign(new Error('Too many wrong attempts. Please try again after 10 minutes.'), { status: 429 });
};
exports.fail = (req, u) => { const k = key(req, u), h = live(k); if (h) h.n++; else hits.set(k, { n: 1, t: Date.now() }); };
exports.clear = (req, u) => hits.delete(key(req, u));
