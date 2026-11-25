// Demo data (har section me 12 records). Chalao:   npm run seed
// DHYAN: ye products, customers, quotations, payments, payment history, employees, tasks, attendance,
//        salary slips, campaigns aur notices ka purana data hata kar demo data daalta hai. Admin login nahi badalta.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const SCHEMA = require('../config/schema');
const calcQuote = require('../utils/quoteCalc');

const pad = n => String(n).padStart(2, '0');
const ymd = dt => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
const day = n => { const dt = new Date(); dt.setDate(dt.getDate() + n); return ymd(dt); };           // aaj se n din
const stamp = (n, h = 10, m = 0) => `${day(n)} ${pad(h)}:${pad(m)}:00`;
const monthOf = off => { const dt = new Date(); dt.setDate(15); dt.setMonth(dt.getMonth() + off); return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`; };

const PASSWORD = 'Welcome@123';

const PRODUCTS = [
  ['Product Management System', 'Software', 'SW-001', 25000, null, 'Manage products, stock and catalogue'],
  ['POS Basic', 'POS', 'POS-001', 12000, null, 'Billing and invoices'],
  ['POS + Waiter Management', 'POS', 'POS-002', 20000, null, 'POS with waiter accounts and tracking'],
  ['POS + Waiter Management + Table Order System', 'POS', 'POS-003', 30000, null, 'POS, waiters and table ordering'],
  ['Basic Website', 'Website', 'WEB-001', 20000, null, 'Simple business website'],
  ['Ecommerce Website', 'Website', 'WEB-002', 45000, null, 'Online store with orders and payments'],
  ['Mobile Application', 'Mobile App', 'APP-001', 60000, null, 'Android + iOS app for your business'],
  ['Student Management System', 'Software', 'SW-002', 35000, null, 'Admissions, fees and attendance for institutes'],
  ['Thermal Printer', 'Hardware', 'HW-001', 6500, 14, '80mm thermal billing printer'],
  ['Barcode Scanner', 'Hardware', 'HW-002', 3200, 4, 'USB barcode scanner (low stock)'],
  ['Cash Drawer', 'Hardware', 'HW-003', 4800, 0, 'Metal cash drawer (out of stock)'],
  ['WhatsApp Marketing Pack', 'Marketing', 'MKT-001', 8000, null, 'Bulk messaging setup (inactive)', 'Inactive'],
];

// business, contact, phone, city, product, stage, temp, value, due, followup(day offset|null), type, subject, renewal(day offset|null), createdDaysAgo, notes
const CUSTOMERS = [
  ['Sunrise Traders', 'Rahul Sharma', '9867011234', 'Nagpur', 'POS Basic', 'Lead', 'Hot', 150000, 0, 0, 'Call', 'Discuss POS requirements', null, 3, 'Wants demo this week'],
  ['Green Leaf Cafe', 'Priya Verma', '9876542310', 'Pune', 'POS + Waiter Management', 'Contacted', 'Warm', 75000, 0, 1, 'WhatsApp', 'Send brochure and price', null, 6, ''],
  ['City Mart', 'Amit Patil', '9823055678', 'Mumbai', 'Product Management System', 'Quotation', 'Cold', 250000, 0, 3, 'Email', 'Confirm requirement and pricing', null, 12, 'Quotation QT-0003 sent'],
  ['Royal Furniture', 'Neha Joshi', '9890177890', 'Nashik', 'Ecommerce Website', 'Negotiation', 'Hot', 325000, 0, -2, 'Meeting', 'Final negotiation meeting', null, 20, 'Asking for 10% discount'],
  ['Smart Solutions', 'Karan Mehta', '9765533421', 'Nagpur', 'Mobile Application', 'Quotation', 'Warm', 120000, 0, -1, 'Call', 'Check interest and next steps', null, 15, ''],
  ['Urban Foods', 'Sneha Kulkarni', '9130066789', 'Aurangabad', 'POS + Waiter Management + Table Order System', 'Customer', 'Hot', 95000, 10000, null, null, null, 330, 40, 'Paid 85%'],
  ['Alpha Enterprises', 'Vikram Rao', '9922334455', 'Nagpur', 'Product Management System', 'Customer', 'Hot', 450000, 0, null, null, null, 300, 60, ''],
  ['Star Traders', 'Pooja Deshmukh', '9811122233', 'Pune', 'POS Basic', 'Customer', 'Warm', 300000, 0, null, null, null, 200, 45, ''],
  ['Techno Services', 'Rohit Jain', '9988776655', 'Mumbai', 'Basic Website', 'Contacted', 'Warm', 80000, 0, 5, 'Call', 'Share website samples', null, 2, ''],
  ['Metro Retail', 'Anjali Singh', '9877766655', 'Nagpur', 'Student Management System', 'Negotiation', 'Hot', 250000, 0, 0, 'WhatsApp', 'Follow up on invoice discussion', null, 25, ''],
  ['Prime Auto', 'Sanjay Gupta', '9766655544', 'Nashik', 'Basic Website', 'Lost', 'Cold', 250000, 0, null, null, null, null, 50, 'Went with another vendor'],
  ['Om Trading Co.', 'Deepak Shah', '9855544433', 'Aurangabad', 'POS Basic', 'Lead', 'Cold', 100000, 0, 7, 'Meeting', 'Intro meeting at shop', null, 1, ''],
];

// client, items, total, status, qdate offset, validity days
const QUOTES = [
  ['Sunrise Traders', 'POS Basic - 12000\nThermal Printer - 6500\nInstallation - 2500', 21000, 'Accepted', -20, 15],
  ['Green Leaf Cafe', 'POS + Waiter Management - 20000\nBarcode Scanner - 3200', 23200, 'Sent', -3, 15],
  ['City Mart', 'Product Management System - 25000\nSupport 1 year - 5000', 30000, 'Sent', -5, 15],
  ['Royal Furniture', 'Ecommerce Website - 45000\nDomain + Hosting - 6000', 51000, 'Draft', -2, 15],
  ['Smart Solutions', 'Mobile Application - 60000', 60000, 'Rejected', -14, 15],
  ['Urban Foods', 'POS + Waiter + Table Order - 30000\nCash Drawer - 4800', 34800, 'Accepted', -40, 15],
  ['Alpha Enterprises', 'Product Management System - 25000\nCustom reports - 8000', 33000, 'Accepted', -60, 15],
  ['Star Traders', 'POS Basic - 12000', 12000, 'Accepted', -45, 15],
  ['Techno Services', 'Basic Website - 20000\nSEO setup - 4000', 24000, 'Draft', -1, 15],
  ['Metro Retail', 'Student Management System - 35000\nTraining - 5000', 40000, 'Sent', -7, 15],
  ['Prime Auto', 'Basic Website - 20000', 20000, 'Rejected', -35, 15],
  ['Om Trading Co.', 'POS Basic - 12000\nThermal Printer - 6500', 18500, 'Draft', 0, 15],
];

// client, phone, for, total, paid (receipts list [amount, method, ref, daysAgo]), nextDue offset, nextAmount
const PAYMENTS = [
  ['Sunrise Traders', '9867011234', 'POS Basic', 21000, [[10500, 'UPI', 'UPI2611001', 18]], 5, 10500],
  ['Green Leaf Cafe', '9876542310', 'POS + Waiter Management', 23200, [], 2, 11600],
  ['City Mart', '9823055678', 'Product Management System', 30000, [[15000, 'Bank transfer', 'UTR84627290', 4]], 10, 15000],
  ['Royal Furniture', '9890177890', 'Ecommerce Website', 51000, [[25500, 'Cheque', 'CHQ 004512', 9]], -3, 25500],
  ['Smart Solutions', '9765533421', 'Mobile Application', 60000, [], -6, 30000],
  ['Urban Foods', '9130066789', 'POS + Waiter + Table Order', 34800, [[17400, 'Cash', '', 38], [12400, 'UPI', 'UPI2610077', 12]], 8, 5000],
  ['Alpha Enterprises', '9922334455', 'Product Management System', 33000, [[33000, 'Bank transfer', 'UTR73519082', 55]], null, null],
  ['Star Traders', '9811122233', 'POS Basic', 12000, [[12000, 'Card', 'CARD 4421', 40]], null, null],
  ['Techno Services', '9988776655', 'Basic Website', 24000, [], 14, 12000],
  ['Metro Retail', '9877766655', 'Student Management System', 40000, [[20000, 'UPI', 'UPI2611120', 2]], 12, 20000],
  ['Prime Auto', '9766655544', 'Basic Website', 20000, [[5000, 'Cash', '', 30]], -20, 5000],
  ['Om Trading Co.', '9855544433', 'POS Basic', 18500, [], 20, 9250],
];

// name, department, role, salary basic, phone, joinedDaysAgo, status, loginEnabled
const EMPLOYEES = [
  ['Anita Deshmukh', 'HR', 'HR Manager', 40000, '9890011001', 800, 'Active', 1],
  ['Rakesh Pandey', 'HR', 'HR Executive', 28000, '9890011002', 400, 'Active', 1],
  ['Gaurav Wankhede', 'Developer', 'Senior Developer', 55000, '9890011003', 900, 'Active', 1],
  ['Tejas Jaiswal', 'Developer', 'Frontend Developer', 42000, '9890011004', 500, 'Active', 1],
  ['Ashwin Kale', 'Developer', 'Backend Developer', 45000, '9890011005', 300, 'Active', 1],
  ['Meera Nair', 'Trainer', 'Software Trainer', 32000, '9890011006', 450, 'Active', 1],
  ['Suresh Bhoyar', 'Trainer', 'Technical Trainer', 30000, '9890011007', 200, 'Inactive', 0],
  ['Isha Kapoor', 'Digital Marketing', 'Digital Marketing Lead', 38000, '9890011008', 350, 'Active', 1],
  ['Varun Thakur', 'Digital Marketing', 'Social Media Executive', 26000, '9890011009', 150, 'Active', 1],
  ['Rohan Mishra', 'Sales Team', 'Sales Manager', 48000, '9890011010', 700, 'Active', 1],
  ['Pallavi Ingle', 'Sales Team', 'Sales Executive', 30000, '9890011011', 250, 'Active', 1],
  ['Nitin Raut', 'Sales Team', 'Sales Executive', 30000, '9890011012', 100, 'Active', 1],
];

// title, description, employee index, priority, deadline offset, status, remark
const TASKS = [
  ['Fix invoice print bug', 'Alignment issue in POS invoice', 2, 'High', 1, 'In Progress', ''],
  ['Build salary slip PDF', 'Add logo and signature', 3, 'Medium', 3, 'Open', ''],
  ['API for follow-ups', 'Type and subject fields', 4, 'Medium', -1, 'Open', ''],
  ['Update HR policy document', 'New leave policy 2027', 0, 'Low', 5, 'Open', ''],
  ['Interview 3 candidates', 'Developer position', 1, 'High', 0, 'In Progress', ''],
  ['Prepare POS training deck', 'For Urban Foods staff', 5, 'Medium', 4, 'Open', ''],
  ['Run Diwali campaign', 'Facebook + Instagram ads', 7, 'High', -2, 'Done', 'Good response'],
  ['Create 10 social posts', 'December festival posts', 8, 'Low', 6, 'Open', ''],
  ['Call 15 old leads', 'Warm leads from October', 9, 'High', 0, 'Open', ''],
  ['Send quotation to Metro Retail', 'Student management', 10, 'Medium', 1, 'In Progress', ''],
  ['Visit Om Trading Co.', 'Intro meeting', 11, 'Medium', 7, 'Open', ''],
  ['Update CRM data', 'Clean duplicate leads', 9, 'Low', -3, 'Done', 'Done']
];

const CAMPAIGNS = [
  ['Diwali Offer 2026', 'Facebook Ads', 15000, 42, -30], ['Google Search - POS', 'Google Ads', 22000, 31, -25],
  ['Instagram Reels', 'Instagram', 8000, 18, -20], ['WhatsApp Broadcast Nov', 'WhatsApp', 3000, 24, -15],
  ['Website SEO', 'SEO', 12000, 11, -45], ['Cafe Owners Email', 'Email', 1500, 9, -12],
  ['Local Newspaper Ad', 'Print', 10000, 6, -50], ['YouTube Demo Videos', 'YouTube', 5000, 14, -18],
  ['Justdial Listing', 'Directory', 6000, 20, -60], ['Referral Offer', 'Referral', 2000, 12, -10],
  ['LinkedIn Outreach', 'LinkedIn', 4000, 8, -8], ['Year End Sale', 'Facebook Ads', 9000, 5, -3],
];

const NOTICES = [
  ['Office closed on Sunday', 'Office will remain closed this Sunday.', -2], ['Salary slips ready', 'November salary slips are uploaded.', -1],
  ['New POS version', 'POS v2.1 released. Please update clients.', -5], ['Team meeting Monday', 'Monday 11 AM, conference room.', -3],
  ['Training session', 'Sales training on Friday at 4 PM.', -6], ['Holiday list 2027', 'Holiday list shared on email.', -9],
  ['Target for December', 'Sales target is Rs 12 lakh.', -4], ['Wear ID cards', 'ID cards are compulsory from Monday.', -10],
  ['Diwali bonus', 'Bonus will be paid with salary.', -15], ['Client visit rules', 'Inform manager before client visits.', -12],
  ['Backup reminder', 'Take daily backup of project files.', -8], ['Welcome new joinees', 'Please welcome our new team members.', -7],
];

async function ins(table, obj) {
  for (const k of Object.keys(obj)) if (k !== 'created_at' && !(k in SCHEMA[table])) throw new Error(`${table}.${k} schema me nahi hai`);
  const [x] = await db.pool.query(`INSERT INTO \`${table}\` SET ?`, [obj]);
  return x.insertId;
}

(async () => {
  await db.init();
  for (const t of ['products', 'customers', 'quotations', 'payments', 'payment_history', 'employees', 'tasks', 'attendance', 'salary_slips', 'campaigns', 'announcements', 'messages', 'notifications'])
    await db.pool.query(`DELETE FROM \`${t}\``);

  for (const [name, category, sku, price, stock, description, status] of PRODUCTS)
    await ins('products', { name, category, sku, price, stock, description, status: status || 'Active' });

  const SOURCES = ['Referral', 'Meta campaign', 'Google', 'Website', 'Walk-in', 'Referral', 'Cold call', 'Meta campaign', 'Website', 'Google', 'Referral', 'Walk-in'];
  const REFERRERS = { 0: 'Mr. Kulkarni', 5: 'Alpha Enterprises', 10: 'Dr. Joshi' };
  for (const [ci, c] of CUSTOMERS.entries()) {
    const [business, contact, phone, city, product, stage, temperature, value, due, fu, type, subject, renewal, ago, notes] = c;
    await ins('customers', { business, contact, phone, city, product, stage, temperature, value, due,
      followup_date: fu === null ? null : day(fu), followup_type: type, followup_subject: subject,
      followup_done_at: stage === 'Customer' ? day(-5) : null, renewal_date: renewal === null ? null : day(renewal),
      lead_source: SOURCES[ci], referred_by: SOURCES[ci] === 'Referral' ? (REFERRERS[ci] || 'Existing customer') : null,
      notes: notes || null, created_at: stamp(-ago) });
  }

  let qn = 0;
  for (const [client, itemsText, , status, off, valid] of QUOTES) {
    const items = itemsText.split('\n').map(l => { const m = l.match(/^(.*?)\s*-\s*([\d.]+)$/); return { name: m[1], desc: '', qty: 1, rate: Number(m[2]), disc: 0 }; });
    const gstOn = qn % 4 !== 3, disc = qn % 5 === 2 ? 5 : 0;
    const c = calcQuote(items, disc, gstOn, 18);
    const cust = CUSTOMERS.find(x => x[0] === client);
    await ins('quotations', { no: 'QT-' + pad4(++qn), qdate: day(off), valid_till: day(off + valid), client, contact: cust && cust[1], client_phone: cust && cust[2], client_address: cust && cust[3],
      items_json: JSON.stringify(c.lines), items: c.lines.map(l => `${l.name} - ${l.amount}`).join('\n'), subtotal: c.subtotal, discount_pct: disc, gst_on: gstOn ? 1 : 0, gst_rate: 18, gst_amount: c.gst, total: c.total,
      status, notes: 'Thank you for your interest.', terms: 'This quotation is valid until the date shown above.\nAll prices are in Indian Rupees (INR). GST is charged extra unless stated otherwise.\nPayment terms: 50% advance with the order and the balance on delivery or go-live.' });
  }

  let rc = 0;
  for (const [client, phone, for_what, total, receipts, nextOff, nextAmt] of PAYMENTS) {
    const paid = receipts.reduce((a, r) => a + r[0], 0);
    const status = paid >= total ? 'Paid' : paid > 0 ? 'Partly paid' : 'Pending';
    const pid = await ins('payments', { client, phone, for_what, total, paid, status, next_due: nextOff === null ? null : day(nextOff), next_amount: nextAmt,
      auto_reminder: status === 'Paid' ? 'Off' : 'On', remind_before: 2, repeat_days: status === 'Paid' ? null : 30 });
    for (const [amount, method, reference, ago] of receipts)
      await ins('payment_history', { payment_id: pid, receipt_no: 'RC-' + pad4(++rc), client, phone, for_what, method, reference: reference || null, amount, paid_on: day(-ago) });
  }

  const hash = await bcrypt.hash(PASSWORD, 10);
  const ids = [];
  for (const [name, department, role, , phone, joinedAgo, status, enabled] of EMPLOYEES) {
    const first = name.split(' ')[0].toLowerCase();
    ids.push(await ins('employees', { name, department, role, phone, email: `${first}@amplemind.in`, joined: day(-joinedAgo), status,
      address: `Plot ${10 + joinedAgo % 80}, Ramdaspeth, Nagpur 440010`, referred_by: joinedAgo % 3 === 0 ? 'Rakesh Pandey' : null,
      aadhaar: String(Math.floor(2e11 + Math.random() * 7e11)), bank_holder: name, bank_name: 'HDFC Bank', bank_account: String(Math.floor(1e11 + Math.random() * 9e11)),
      ifsc: 'HDFC0000123', branch: 'Sitabuldi, Nagpur', upi: `${first}@okhdfcbank`,
      username: first, password_hash: hash, login_enabled: enabled }));
  }

  // Salary slips: pichhle 2 mahine, 6 employees x 2 = 12
  for (const i of [0, 2, 3, 5, 7, 9]) for (const off of [-1, 0]) {
    const [name, , role, basic] = EMPLOYEES[i];
    const hra = Math.round(basic * 0.2), allowances = Math.round(basic * 0.1), bonus = off === -1 ? 2000 : 0, deductions = Math.round(basic * 0.06);
    const present = 22 + (i % 3 === 0 ? 0 : -1);
    await ins('salary_slips', { employee_id: ids[i], employee: name, designation: role, slip_month: monthOf(off), working_days: 26, days_present: present,
      basic, hra, allowances, bonus, deductions, net: basic + hra + allowances + bonus - deductions,
      paid_on: off === -1 ? day(-24) : null, notes: off === -1 ? 'Paid by bank transfer' : null });
  }

  const taskIds = [];
  for (const [title, description, ei, priority, dl, status, remark] of TASKS)
    taskIds.push(await ins('tasks', { title, description, employee: EMPLOYEES[ei][0], employee_id: ids[ei], priority, deadline: day(dl), deadline_time: dl % 2 === 0 ? '17:00' : null,
      related: CUSTOMERS[dl < 0 ? 0 : (ei + 3) % CUSTOMERS.length][0], status,
      remark: remark || null, completed_at: status === 'Done' ? stamp(dl) : null }));

  // Chat: task ki chat + admin ke saath seedhi chat (12 messages)
  const msg = (employee_id, task_id, sender, body, ago, readAdmin = 1, readEmp = 1) => ins('messages', { employee_id, task_id, sender,
    sender_name: sender === 'admin' ? 'Admin' : sender === 'system' ? EMPLOYEES[ids.indexOf(employee_id)][0] : EMPLOYEES[ids.indexOf(employee_id)][0],
    body, read_admin: readAdmin, read_employee: readEmp, created_at: stamp(0, 9, 0).replace(/ .*/, '') + ` ${pad(10 + Math.floor(ago / 60) % 12)}:${pad(ago % 60)}:00` });
  await msg(ids[2], taskIds[0], 'admin', 'Please check the invoice alignment on the 80mm printer too.', 5);
  await msg(ids[2], taskIds[0], 'employee', 'Sure, I will test it on both printers today.', 12);
  await msg(ids[2], taskIds[0], 'admin', 'Great. Share a photo of the printout when done.', 20, 1, 0);
  await msg(ids[3], taskIds[1], 'employee', 'Do we need the company seal on the salary slip as well?', 8, 0, 1);
  await msg(ids[7], taskIds[6], 'system', 'Isha Kapoor marked this task as completed. Note: Good response', 30, 0, 1);
  await msg(ids[9], null, 'admin', 'Rohan, please share the status of Metro Retail by evening.', 15);
  await msg(ids[9], null, 'employee', 'Sir, quotation is sent. Waiting for their reply.', 25);
  await msg(ids[9], null, 'admin', 'Okay, call them tomorrow morning.', 40, 1, 0);
  await msg(ids[0], null, 'employee', 'Good morning sir, I need leave on Friday. Is that fine?', 3, 0, 1);
  await msg(ids[0], null, 'employee', 'I will complete the HR policy document before that.', 4, 0, 1);
  await msg(ids[10], null, 'admin', 'Pallavi, please follow up with Techno Services today.', 50);
  await msg(ids[10], null, 'employee', 'Done sir, they will confirm by Monday.', 55, 0, 1);
  // Admin alerts
  await ins('notifications', { kind: 'task_done', title: 'Isha Kapoor completed a task', body: 'Run Diwali campaign - Good response', link: '/admin/tasks', employee_id: ids[7], is_read: 0 });
  await ins('notifications', { kind: 'task_done', title: 'Rohan Mishra completed a task', body: 'Update CRM data - Done', link: '/admin/tasks', employee_id: ids[9], is_read: 1 });

  // Attendance: pichhle 3 din, 4 active employees
  for (const ei of [0, 2, 3, 9]) for (const off of [-3, -2, -1]) {
    await ins('attendance', { employee_id: ids[ei], employee: EMPLOYEES[ei][0], att_date: day(off), check_in: stamp(off, 9, 30 + ei), check_out: stamp(off, 18, 15) });
  }

  for (const [name, channel, spend, leads, start] of CAMPAIGNS) await ins('campaigns', { name, channel, spend, leads, start_date: day(start) });
  for (const [title, message, off] of NOTICES) await ins('announcements', { title, message, posted_on: day(off) });

  console.log('Demo data ready.');
  console.log(`Employee logins (password sabka: ${PASSWORD})`);
  EMPLOYEES.forEach((e, i) => console.log(`  ${e[1].padEnd(18)} ${e[0].padEnd(18)} username: ${e[0].split(' ')[0].toLowerCase()}${EMPLOYEES[i][7] ? '' : '  (login disabled)'}`));
  process.exit(0);
})().catch(e => { console.error('Seed failed:', e.message); process.exit(1); });

function pad4(n) { return String(n).padStart(4, '0'); }
