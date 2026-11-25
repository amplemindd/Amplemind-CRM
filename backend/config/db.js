const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const SCHEMA = require('./schema');
const { DB_HOST = 'localhost', DB_USER = 'root', DB_PASSWORD = '', DB_NAME = 'amplemind_crm', TZ_OFFSET = '+05:30',
        ADMIN_USER, ADMIN_PASS, ADMIN_NAME } = process.env;
const TYPE = { s: 'VARCHAR(255)', t: 'TEXT', l: 'LONGTEXT', n: 'DECIMAL(12,2)', i: 'INT', d: 'DATE', dt: 'DATETIME' };

// db.now / db.today: query me seedha NOW() / CURDATE() likhne ke liye (INSERT/UPDATE ... SET ? me chalta hai)
const db = { pool: null, now: { toSqlString: () => 'NOW()' }, today: { toSqlString: () => 'CURDATE()' } };

// next_due (YYYY-MM-DD) me n din jod kar naya date (aaj ya purani date se, jo bhi baad ki ho)
db.addDays = (from, n) => {
  const base = from && new Date(from) > new Date() ? new Date(from) : new Date();
  base.setDate(base.getDate() + Number(n));
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
};

db.init = async () => {
  // GoDaddy / cPanel par DB user ko CREATE DATABASE ki permission nahi hoti (database cPanel se banta hai).
  // Isliye yahan fail ho to ignore karte hain; database pehle se bana hona chahiye.
  try {
    const c = await mysql.createConnection({ host: DB_HOST, user: DB_USER, password: DB_PASSWORD });
    await c.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
    await c.end();
  } catch (e) { console.log('CREATE DATABASE skip (cPanel me DB pehle se banao):', e.code || e.message); }
  db.pool = mysql.createPool({ host: DB_HOST, user: DB_USER, password: DB_PASSWORD, database: DB_NAME,
                               dateStrings: true, decimalNumbers: true, connectionLimit: 10 });
  // Har connection par India time (attendance / CURDATE() sahi din dikhaye)
  db.pool.pool.on('connection', conn => conn.query(`SET time_zone='${TZ_OFFSET}'`));

  // Tables banao + purani tables me naye columns add karo (migration)
  for (const [t, cols] of Object.entries(SCHEMA)) {
    const defs = Object.entries(cols).map(([k, v]) => `\`${k}\` ${TYPE[v]} NULL`).join(',');
    await db.pool.query(`CREATE TABLE IF NOT EXISTS \`${t}\` (id INT AUTO_INCREMENT PRIMARY KEY, ${defs}, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    const [have] = await db.pool.query('SELECT COLUMN_NAME AS c FROM information_schema.columns WHERE table_schema=? AND table_name=?', [DB_NAME, t]);
    const names = new Set(have.map(x => x.c));
    for (const [k, v] of Object.entries(cols)) {
      if (!names.has(k)) await db.pool.query(`ALTER TABLE \`${t}\` ADD COLUMN \`${k}\` ${TYPE[v]} NULL`);
    }
  }
  // Ek employee ka ek din me ek hi attendance record
  try { await db.pool.query('ALTER TABLE attendance ADD UNIQUE KEY uq_emp_day (employee_id, att_date)'); } catch (e) { /* already hai */ }

  // Purane data ko naye "employee id" system se jodo (naam match karke)
  await db.pool.query('UPDATE tasks t JOIN employees e ON e.name=t.employee SET t.employee_id=e.id WHERE t.employee_id IS NULL AND t.employee IS NOT NULL');
  await db.pool.query('UPDATE customers c JOIN employees e ON e.name=c.assigned_to SET c.assigned_id=e.id WHERE c.assigned_id IS NULL AND c.assigned_to IS NOT NULL');

  // Admin accounts
  await db.pool.query(`CREATE TABLE IF NOT EXISTS admins (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NULL, password_hash VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  const [[{ a }]] = await db.pool.query('SELECT COUNT(*) a FROM admins');
  if (!a) {
    const username = (ADMIN_USER || 'admin').trim().toLowerCase(), password = ADMIN_PASS || 'Admin@123';
    await db.pool.query('INSERT INTO admins (username,name,password_hash) VALUES (?,?,?)', [username, ADMIN_NAME || 'Admin', await bcrypt.hash(password, 10)]);
    console.log(`Admin account bana diya -> username: ${username}  (password: .env ke ADMIN_PASS wala). Login ke baad Settings me password badal lo.`);
  }

  const [[{ n }]] = await db.pool.query('SELECT COUNT(*) n FROM products');
  if (!n) {
    const seed = [['Product Management System', 'Manage products, stock and catalogue'], ['POS Basic', 'Billing and invoices'],
      ['POS + Waiter Management', 'POS with waiter accounts and tracking'],
      ['POS + Waiter Management + Table Order System', 'POS, waiters and table ordering'],
      ['Basic Website', 'Simple business website'], ['Ecommerce Website', 'Online store with orders and payments'],
      ['Mobile Application', 'Mobile app for your business']];
    for (const [name, description] of seed) await db.pool.query('INSERT INTO products (name,description) VALUES (?,?)', [name, description]);
  }
};
module.exports = db;
