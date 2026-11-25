import { Navigate, useParams } from 'react-router-dom';
import LoginForm from '../../components/LoginForm';
import { deptBySlug } from '../../config';

// Department ka alag login page  ->  /#/login/hr, /#/login/developer, /#/login/trainer, /#/login/digital-marketing, /#/login/sales
export default function EmployeeLogin() {
  const { slug } = useParams();
  const dept = deptBySlug(slug);
  return dept ? <LoginForm role="employee" dept={dept} /> : <Navigate to="/" replace />;
}
