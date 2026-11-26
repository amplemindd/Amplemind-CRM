import LoginForm from '../../components/LoginForm';

// Admin ka login  ->  /admin  (RequireRole login na hone par yahi form dikhata hai)
export default function AdminLogin() {
  return <LoginForm role="admin" />;
}
