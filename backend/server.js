require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/db');
const { authenticate, requireRole, requireDept } = require('./middleware/auth');

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '10mb' })); // photos (resize hokar) JSON me aati hain

// Public: login
app.use('/api/auth', require('./routes/auth'));

// Live alerts (sound) + voice calls: admin aur employee dono ke liye
app.use('/api/live', authenticate, require('./routes/live'));

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

// App icons (PWA install ke liye) - pwaIcons.js se aate hain
require('./pwaIcons')(app);

// Production: React build folder yahi se serve hota hai (npm run build ke baad)
app.use(express.static(path.join(__dirname, '..', 'frontend', 'build')));

const PORT = process.env.PORT || 5000;
db.init().then(() => app.listen(PORT, () => console.log(`CRM chal raha hai: http://localhost:${PORT} (API)`)))
  .catch(e => { console.error('DB error - .env check karo:', e.message); process.exit(1); });