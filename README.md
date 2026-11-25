# Amplemind CRM v2  (React JS + Node.js/Express + MySQL)

Admin aur Employee ka **alag-alag login**. Admin jo task / lead kisi employee ko deta hai, wo **sirf usi employee ko** dikhta hai.

```
amplemind-crm/
  backend/                 Node.js + Express API (port 5000)
    server.js              routes yahin jode gaye hain
    config/                db.js (tables auto-banti hain), schema.js, secret.js
    middleware/auth.js     login token check + role check (admin / employee)
    routes/                auth.js, my.js (employee ke routes), employees.js, tasks.js, attendance.js ...
    scripts/reset-admin.js admin password bhool jao to
  frontend/                React JS (port 3000)
    src/pages/auth/        AdminLogin.js, EmployeeLogin.js
    src/pages/admin/       admin ke saare pages (har page ki alag file)
    src/pages/employee/    employee ke saare pages (har page ki alag file)
    src/components/        shared components
```

## Local run (2 terminal)
Terminal 1 - Backend:
```
cd backend
npm install
npm start          -> http://localhost:5000
```
Terminal 2 - Frontend:
```
cd frontend
npm install
npm start          -> http://localhost:3000   (browser me yahi kholo)
```
Pehle `backend/.env` me `DB_PASSWORD` daalo. Database aur tables backend khud banata hai.
**Purana database hai to bhi chalega**: naye columns khud add ho jate hain, purane tasks / leads employee ke naam se khud jud jate hain.

## Login pages
| Kaun | Page | Default |
|---|---|---|
| Admin | `http://localhost:3000/#/admin/login` | username `admin`, password `Admin@123` (`backend/.env` me `ADMIN_USER` / `ADMIN_PASS`) |
| Employee | `http://localhost:3000/#/employee/login` | admin banata hai (neeche dekho) |

`http://localhost:3000` khologe to pehle ek page aayega jahan se Admin ya Employee login chun sakte ho.
Admin ka account **pehli baar server start hone par** `.env` se ban jata hai. Uske baad password **Settings** page se badlo.
Password bhool gaye: `cd backend && npm run reset-admin -- NayaPassword123`

## Employee login kaise banta hai?
1. Admin login karke **Employees** page kholo. Employee pehle se list me na ho to **Add employee** se jodo.
2. Us employee ki row me **Login** button dabao.
3. Username aur password do (password khud suggest hota hai). **Create login** dabao.
4. Ek popup aayega jisme login link + username + password hoga. **Copy** ya **Send on WhatsApp** se employee ko bhej do.
5. Employee link kholke sign in kare. Wo **change password** apne Profile page se kar sakta hai.

Employee ka login **band karna**: Login button, Access = Disabled. Ya employee ko Inactive kar do. Wo turant logout ho jata hai.
Password reset: Login button, naya password daalo.

## Task employee ko kaise jata hai?
Admin: **Tasks, Add task**, "Assign to" me employee chuno (priority aur deadline ke saath). Employee ke **My tasks** me wahi aata hai. Employee Start / Mark done / Note likh sakta hai, aur admin ko Tasks page me status aur note dikhta hai.
Isi tarah **Customers & leads** me "Assigned to" chuno to wo lead employee ke **My leads** me aa jati hai.

## Kya-kya hai
**Admin:** Dashboard (team performance, aaj kitne present), Customers, Pipeline, Follow-ups, Quotations, Payments, Payment history, Employees (+login), Tasks (assign), Attendance (din + mahina), Notices, Products, Campaigns, Analytics, Settings. Har list me **Export CSV**.
**Employee:** Dashboard, My tasks, My leads (naya lead add bhi kar sakta hai), Follow-ups, Attendance (check in / check out), Profile (password).

Security: passwords hashed (bcrypt), login token (JWT), galat password 6 baar par 10 min block, employee ko payments / dusre employees ka data nahi milta.

## Deploy (GoDaddy / VPS)
1. `frontend` me: `npm run build` (build folder banega)
2. Backend `../frontend/build` ko khud serve karta hai, sirf backend chalana hai (`node server.js`).
3. Server pe `.env` banao: DB details, `ADMIN_USER` / `ADMIN_PASS`, aur **`JWT_SECRET` me lamba random text zaroor daalo**.
4. Node.js hosting (VPS / cPanel Node App) chahiye. HTTPS lagao, kyunki login password net par jata hai.
5. Jis URL par site hai, wahi `/#/employee/login` employee ko do.


## v3: Department-wise login (naya)
**Admin sidebar:** Customers & leads, Products, Quotations, Payments, Payment history, Employees, Follow-ups, Pipeline, Salary slips, Employee logins, Admin login.
(Purane pages Dashboard / Tasks / Attendance / Notices / Campaigns / Analytics ke routes code me hain, bas sidebar se hataye gaye. Wapas chahiye to `AdminLayout.js` ke NAV me ek line add karo.)

**Department login (admin banata hai):** Admin > **Employee logins** > department chuno > **New login** (naam, username, password).

| Department | Login page | Sidebar |
|---|---|---|
| HR | `/#/login/hr` | Dashboard, Employees, Team attendance, Salary slips, My tasks, My attendance, My salary slips, Profile |
| Developer | `/#/login/developer` | Dashboard, My tasks, My attendance, My salary slips, Profile |
| Trainer | `/#/login/trainer` | Dashboard, My tasks, My attendance, My salary slips, Profile |
| Digital Marketing | `/#/login/digital-marketing` | Dashboard, Campaigns, My tasks, My attendance, My salary slips, Profile |
| Sales Team | `/#/login/sales` | Dashboard, My leads, Follow-ups, My tasks, My attendance, My salary slips, Profile |

Employee apne department ke login page se hi login kar sakta hai. Galat department ke page par error aata hai.
Salary slip: Admin ya HR banata hai (Salary slips page), employee apni slip **My salary slips** me dekhkar Print / PDF kar sakta hai.
Naya column `department` aur table `salary_slips` server restart par khud ban jati hai. **Purane employees ko Employee logins page se department chuno**, tabhi wo login kar payenge.

## Demo data (10-12 records har section me)
Backend folder me ek baar chalao (server band ho ya chalu, dono me chalta hai):

    cd backend
    npm run seed

Isse Products, Customers & leads, Quotations, Payments, Payment history, Employees (HR / Developer / Trainer / Digital Marketing / Sales Team),
Salary slips, Tasks, Attendance, Campaigns aur Notices me 12-12 demo records ban jate hain. **Purana data in tables se hat jata hai.** Admin login nahi badalta.

Demo employee logins: sabka password `Welcome@123`
| Department | Username |
|---|---|
| HR | anita, rakesh |
| Developer | gaurav, tejas, ashwin |
| Trainer | meera (suresh ka login disabled hai) |
| Digital Marketing | isha, varun |
| Sales Team | rohan, pallavi, nitin |

Login page: `http://localhost:3000/#/login/hr` (developer / trainer / digital-marketing / sales bhi isi tarah).

## v8: naye features
- **Sidebar (Admin):** Dashboard, Customers & leads, Products, Quotations, Payments, Payment history, Employees, Follow-ups, Pipeline, Tasks, Messages, Analytics, Salary slips, Employee logins, Admin login.
- **Tasks + Chat:** Admin task kisi ek employee ko deta hai, sirf wahi employee use apne login me dekhta hai. Har task ki apni chat hai (WhatsApp jaisi, seen ticks ke saath).
  Alag se **Messages** page me admin aur employee kisi bhi query par seedhi baat kar sakte hain.
- **Task complete alert:** Employee "Mark done" dabata hai to admin ko turant toast, sidebar me Tasks par badge, Dashboard ke "Recent updates" me entry aur task chat me line dikhti hai.
- **Employee form:** Profile photo, Aadhaar scan (photo), address, referred by, bank details (holder, bank, account, IFSC, branch, UPI), notes. Photo browser me chhoti hokar save hoti hai.
- **Quotation page:** Customer chuno, products add karo (ya type karo), qty / rate / discount %, extra discount, GST on/off, notes, terms & conditions. Buttons: Save quotation, Save PDF, Print PDF (A4), Send on WhatsApp.
- **Payment history:** Receipt (A4) aur WhatsApp par receipt bhejna.
- **Auto reminder (instalment):** Har payment plan me Auto reminder On/Off, "kitne din pehle", aur "har N din me repeat". Due hone par Payments page ke upar, Dashboard me aur sidebar badge me reminder dikhta hai.
  Dhyan: WhatsApp ka *fully automatic* sandesh bhejne ke liye WhatsApp Business API chahiye. Abhi reminder apne aap ban jata hai aur ek click me WhatsApp message ready khulta hai.
- Salary slip, quotation aur receipt teeno A4 par print hote hain.
- Leads me **Lead source** aur **Referred by**.
