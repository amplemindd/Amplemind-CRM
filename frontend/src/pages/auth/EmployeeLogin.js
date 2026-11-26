import { Navigate, useParams } from 'react-router-dom';
import LoginForm from '../../components/LoginForm';
import { deptBySlug } from '../../config';

// Department ka login  ->  /hr, /developer, /trainer, /digital-marketing, /sales  (RequireRole login na hone par yahi form dikhata hai)
export default function EmployeeLogin() {
  const { slug } = useParams();
  const dept = deptBySlug(slug);
  return dept ? <LoginForm role="employee" dept={dept} /> : <Navigate to="/" replace />;
}
