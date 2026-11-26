require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const DEPTS = require('./config/departments');
const db = require('./config/db');
const { authenticate, requireRole, requireDept } = require('./middleware/auth');

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '30mb' })); // photos + documents (PDF / photo) JSON me aate hain

// Public: login
app.use('/api/auth', require('./routes/auth'));

// Live alerts (sound) + voice calls: admin aur employee dono ke liye
app.use('/api/live', authenticate, require('./routes/live'));

// Push notification register (phone / browser)
app.use('/api/push', authenticate, require('./routes/push'));

// Employee ke routes (sirf employee login wale)
app.use('/api/my', authenticate, requireRole('employee'), require('./routes/my'));

// Department ke routes: HR aur Digital Marketing (baaki department ko sirf /api/my milta hai)
const emp = [authenticate, requireRole('employee')];
app.use('/api/hr', ...emp, requireDept('HR'), require('./routes/hr'));
app.use('/api/dm/campaigns', ...emp, requireDept('Digital Marketing'), require('./routes/campaigns'));

// Admin ke routes (sirf admin login wale)
const admin = [authenticate, requireRole('admin')];
app.use('/api/dashboard', ...admin, require('./routes/dashboard'));
app.use('/api/customers', ...admin, require('./routes/customers'));
app.use('/api/products', ...admin, require('./routes/products'));
app.use('/api/quotations', ...admin, require('./routes/quotations'));
app.use('/api/payments', ...admin, require('./routes/payments'));
app.use('/api/payment_history', ...admin, require('./routes/paymentHistory'));
app.use('/api/employees', ...admin, require('./routes/employees'));
app.use('/api/tasks', ...admin, require('./routes/tasks'));
app.use('/api/campaigns', ...admin, require('./routes/campaigns'));
app.use('/api/attendance', ...admin, require('./routes/attendance'));
app.use('/api/salary_slips', ...admin, require('./routes/salary'));
app.use('/api/announcements', ...admin, require('./routes/announcements'));
app.use('/api/messages', ...admin, require('./routes/messages'));
app.use('/api/notifications', ...admin, require('./routes/notifications'));
app.use('/api', (req, res) => res.status(404).send('Not found'));

// Production: React build folder yahi se serve hota hai (npm run build ke baad)
const BUILD = path.join(__dirname, '..', 'frontend', 'build');

// Har role ka apna installable app (PWA) aur saaf link: /admin, /hr, /developer, /trainer, /digital-marketing, /sales
// Us link par sirf usi role ka login dikhta hai, aur wahin se "Install app" hota hai.
const APPS = { admin: { name: 'Amplemind Admin', short: 'Admin' } };
DEPTS.forEach(d => { APPS[d.slug] = { name: `Amplemind ${d.label}`, short: d.label }; });
const isApp = s => Object.prototype.hasOwnProperty.call(APPS, s);

app.get('/:slug/manifest.webmanifest', (req, res, next) => {
  const s = req.params.slug;
  if (!isApp(s)) return next();
  const a = APPS[s], icon = n => `/icons/${s}-${n}.png`;
  res.type('application/manifest+json').set('Cache-Control', 'no-cache').json({
    id: `/${s}/`, name: a.name, short_name: a.short, description: `${a.name} - Amplemind Technologies`,
    start_url: `/${s}/`, scope: `/${s}/`, display: 'standalone', orientation: 'portrait',
    background_color: '#101a2e', theme_color: '#101a2e',
    icons: [{ src: icon(192), sizes: '192x192', type: 'image/png', purpose: 'any maskable' }, { src: icon(512), sizes: '512x512', type: 'image/png', purpose: 'any maskable' }],
  });
});

// Purane /app/trainer jaise links ko naye saaf link par bhejo
app.get(['/app/:slug', '/app/:slug/*'], (req, res) => res.redirect(302, isApp(req.params.slug) ? '/' + req.params.slug : '/'));

app.use(express.static(BUILD, { index: false, setHeaders: (res, p) => { if (/sw\.js$/.test(p)) res.set('Cache-Control', 'no-cache'); } })); // sw.js hamesha fresh

// Baaki saare pages (/, /admin, /trainer, /trainer/tasks ...) React ka index.html. Role ke link par us role ka manifest + mode jod dete hain.
app.get('*', (req, res) => {
  if (path.extname(req.path)) return res.status(404).send('Not found'); // koi file (js/css/png) nahi mili
  fs.readFile(path.join(BUILD, 'index.html'), 'utf8', (err, html) => {
    if (err) return res.status(404).send('Frontend build nahi mila. npm run build chalao.');
    const s = req.path.split('/')[1];
    if (isApp(s)) {
      const a = APPS[s];
      const head = `<link rel="manifest" href="/${s}/manifest.webmanifest"><link rel="apple-touch-icon" href="/icons/${s}-192.png">` +
        `<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="${a.short}">` +
        `<script>window.__APP__=${JSON.stringify(s)}</script>`;
      html = html.replace(/<title>.*?<\/title>/, `<title>${a.name}</title>`).replace('</head>', head + '</head>');
    }
    res.set('Cache-Control', 'no-cache').type('html').send(html);
  });
});

const PORT = process.env.PORT || 5000;
db.init().then(() => app.listen(PORT, () => console.log(`CRM chal raha hai: http://localhost:${PORT} (API)`)))
  .catch(e => { console.error('DB error - .env check karo:', e.message); process.exit(1); });
