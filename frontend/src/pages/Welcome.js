import { Link, Navigate } from 'react-router-dom';
import { LOGIN_PATH, MODE } from '../appMode';
import { useAuth } from '../components/AuthContext';
import Icon from '../components/Icon';
import { COMPANY, DEPARTMENTS } from '../config';

// Pehla page: Admin ya department login chuno. Login hai to seedha apne panel me.
// Role ke app (/app/trainer jaise) me ye page nahi dikhta, seedha usi role ka login khulta hai.
export default function Welcome() {
  const { user } = useAuth();
  if (user) return <Navigate to={`/${user.role}`} replace />;
  if (MODE) return <Navigate to={LOGIN_PATH} replace />;
  return (
    <div className="welcome">
      <div className="brand"><i>A</i><div><b>Amplemind CRM</b><span>{COMPANY}</span></div></div>
      <h1>Welcome back</h1>
      <p className="muted">Choose your login.</p>
      <div className="portals three">
        <Link to="/admin/login" className="portal">
          <span className="pi"><Icon name="shield" /></span>
          <h2>Admin login</h2>
          <p>Customers, payments, employees, salary slips and all logins.</p>
          <span className="go">Continue <Icon name="arrow" /></span>
        </Link>
        {DEPARTMENTS.map(d => (
          <Link key={d.slug} to={`/login/${d.slug}`} className="portal emp">
            <span className="pi"><Icon name="user" /></span>
            <h2>{d.label} login</h2>
            <p>{d.desc}</p>
            <span className="go">Continue <Icon name="arrow" /></span>
          </Link>))}
      </div>
    </div>
  );
}
