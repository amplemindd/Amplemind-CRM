import { Navigate, useParams } from 'react-router-dom';
import { LOGIN_PATH, MODE, MODE_DEPT } from '../../appMode';
import LoginForm from '../../components/LoginForm';
import { deptBySlug } from '../../config';

// Department ka alag login page  ->  /#/login/hr, /#/login/developer, /#/login/trainer, /#/login/digital-marketing, /#/login/sales
// Kisi role ke app me sirf usi role ka login khulta hai, baaki sab apne login par laut jate hain.
export default function EmployeeLogin() {
  const { slug } = useParams();
  const dept = deptBySlug(slug);
  if (MODE === 'admin' || (MODE_DEPT && slug !== MODE_DEPT.slug)) return <Navigate to={LOGIN_PATH} replace />;
  return dept ? <LoginForm role="employee" dept={dept} /> : <Navigate to="/" replace />;
}
