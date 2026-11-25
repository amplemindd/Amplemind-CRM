// Admin password bhool gaye? Ye chalao:   npm run reset-admin -- NayaPassword123
// (ya kisi aur admin ke liye:  npm run reset-admin -- NayaPassword123 username)
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const [, , pass, user] = process.argv;
if (!pass || pass.length < 6) { console.log('Use: npm run reset-admin -- <new-password (min 6)> [username]'); process.exit(1); }

(async () => {
  await db.init();
  const hash = await bcrypt.hash(pass, 10);
  const [[a]] = user
    ? await db.pool.query('SELECT id, username FROM admins WHERE username=?', [user.toLowerCase()])
    : await db.pool.query('SELECT id, username FROM admins ORDER BY id LIMIT 1');
  if (!a) { console.log('Is username ka admin nahi mila.'); process.exit(1); }
  await db.pool.query('UPDATE admins SET password_hash=? WHERE id=?', [hash, a.id]);
  console.log(`Done. "${a.username}" ka naya password set ho gaya.`);
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
