import { Navigate } from 'react-router-dom';
import { LOGIN_PATH, MODE } from '../../appMode';
import LoginForm from '../../components/LoginForm';

// Admin ka alag login page  ->  /#/admin/login   (department ke app me ye page band, wahan se apne login par bhej dete hain)
export default function AdminLogin() {
  if (MODE && MODE !== 'admin') return <Navigate to={LOGIN_PATH} replace />;
  return <LoginForm role="admin" />;
}
