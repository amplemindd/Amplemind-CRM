import { Navigate, useParams } from 'react-router-dom';
import { homeOf, LOGIN_PATH, MODE } from '../appMode';
import { deptBySlug } from '../config';
import AdminLogin from '../pages/auth/AdminLogin';
import EmployeeLogin from '../pages/auth/EmployeeLogin';
import { useAuth } from './AuthContext';

// Page sirf sahi role wale ko dikhao. Login nahi hai to usi link par us role ka login form dikhta hai
// (/admin par Admin login, /trainer par Trainer login). Doosre role ke link khulne nahi dete.
export default function RequireRole({ role, children }) {
  const { user } = useAuth();
  const { slug } = useParams();

  if (role === 'employee') {
    const dept = deptBySlug(slug);
    if (!dept) return <Navigate to={slug === 'employee' && user ? homeOf(user) : '/'} replace />; // galat / purana /employee link
    if (MODE && MODE !== slug) return <Navigate to={LOGIN_PATH} replace />; // is app me sirf apna role
    if (!user) return <EmployeeLogin />;
    if (user.role !== 'employee' || user.department !== dept.key) return <Navigate to={homeOf(user)} replace />;
    return children;
  }

  if (MODE && MODE !== 'admin') return <Navigate to={LOGIN_PATH} replace />;
  if (!user) return <AdminLogin />;
  if (user.role !== 'admin') return <Navigate to={homeOf(user)} replace />;
  return children;
}
