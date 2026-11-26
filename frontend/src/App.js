import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import RequireRole from './components/RequireRole';
import AdminLayout from './components/AdminLayout';
import EmployeeLayout from './components/EmployeeLayout';

import Welcome from './pages/Welcome';

import AdminDashboard from './pages/admin/Dashboard';
import Customers from './pages/admin/Customers';
import Pipeline from './pages/admin/Pipeline';
import Followups from './pages/admin/Followups';
import Quotations from './pages/admin/Quotations';
import Payments from './pages/admin/Payments';
import PaymentHistory from './pages/admin/PaymentHistory';
import Employees from './pages/admin/Employees';
import Tasks from './pages/admin/Tasks';
import Attendance from './pages/admin/Attendance';
import Announcements from './pages/admin/Announcements';
import Products from './pages/admin/Products';
import Campaigns from './pages/admin/Campaigns';
import Analytics from './pages/admin/Analytics';
import Settings from './pages/admin/Settings';
import QuotationForm from './pages/admin/QuotationForm';
import Messages from './pages/admin/Messages';
import EmployeeLogins from './pages/admin/EmployeeLogins';
import SalarySlips from './pages/admin/SalarySlips';

import EmployeeDashboard from './pages/employee/Dashboard';
import MyTasks from './pages/employee/MyTasks';
import MyLeads from './pages/employee/MyLeads';
import MyFollowups from './pages/employee/MyFollowups';
import MyAttendance from './pages/employee/MyAttendance';
import MyProfile from './pages/employee/MyProfile';
import MySalary from './pages/employee/MySalary';
import MyMessages from './pages/employee/MyMessages';
import { useAuth } from './components/AuthContext';

// Sirf us department ko dikhao (baaki ko apne dashboard par bhejo)
function OnlyDept({ dept, children }) {
  const { user } = useAuth();
  const { slug } = useParams();
  return user && user.department === dept ? children : <Navigate to={'/' + slug} replace />;
}
// Employee panel ke andar galat page -> apna dashboard
function ToHome() { const { slug } = useParams(); return <Navigate to={'/' + slug} replace />; }
// Purane links (/login/hr, /admin/login, /employee) naye saaf links par
function OldLogin() { const { slug } = useParams(); return <Navigate to={'/' + slug} replace />; }

export default function App() {
  return (
    <Routes>
      {/* Public: / par saare logins ka chunav. Har role ka apna link: /admin, /hr, /developer, /trainer, /digital-marketing, /sales */}
      <Route path="/" element={<Welcome />} />
      <Route path="/admin/login" element={<Navigate to="/admin" replace />} />
      <Route path="/login/:slug" element={<OldLogin />} />

      {/* Admin panel */}
      <Route path="/admin" element={<RequireRole role="admin"><AdminLayout /></RequireRole>}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="employee-logins" element={<EmployeeLogins />} />
        <Route path="salary-slips" element={<SalarySlips />} />
        <Route path="customers" element={<Customers />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="followups" element={<Followups />} />
        <Route path="quotations" element={<Quotations />} />
        <Route path="quotations/new" element={<QuotationForm />} />
        <Route path="quotations/:id" element={<QuotationForm />} />
        <Route path="messages" element={<Messages />} />
        <Route path="payments" element={<Payments />} />
        <Route path="payment-history" element={<PaymentHistory />} />
        <Route path="employees" element={<Employees />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="products" element={<Products />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>

      {/* Employee panel */}
      <Route path="/:slug" element={<RequireRole role="employee"><EmployeeLayout /></RequireRole>}>
        <Route index element={<EmployeeDashboard />} />
        <Route path="tasks" element={<MyTasks />} />
        <Route path="leads" element={<MyLeads />} />
        <Route path="followups" element={<MyFollowups />} />
        <Route path="attendance" element={<MyAttendance />} />
        <Route path="profile" element={<MyProfile />} />
        <Route path="salary" element={<MySalary />} />
        <Route path="messages" element={<MyMessages />} />
        <Route path="team" element={<OnlyDept dept="HR"><Employees base="hr/employees" /></OnlyDept>} />
        <Route path="team-attendance" element={<OnlyDept dept="HR"><Attendance base="hr/attendance" /></OnlyDept>} />
        <Route path="salary-slips" element={<OnlyDept dept="HR"><SalarySlips base="hr/salary_slips" /></OnlyDept>} />
        <Route path="campaigns" element={<OnlyDept dept="Digital Marketing"><Campaigns base="dm/campaigns" /></OnlyDept>} />
        <Route path="*" element={<ToHome />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
