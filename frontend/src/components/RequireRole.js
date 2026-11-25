import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

// Page sirf sahi role wale ko dikhao. Login nahi hai to us role ke login page par bhejo.
export default function RequireRole({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to={role === 'admin' ? '/admin/login' : '/'} replace />;
  if (user.role !== role) return <Navigate to={`/${user.role}`} replace />;
  return children;
}
