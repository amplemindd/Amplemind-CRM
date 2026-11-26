import { Navigate } from 'react-router-dom';
import { homeOf, LOGIN_PATH, MODE } from '../appMode';
import { useAuth } from '../components/AuthContext';
import Icon from '../components/Icon';
import { COMPANY, DEPARTMENTS } from '../config';

// Pehla page (/): Admin ya department chuno. Login hai to seedha apne panel me.
// /trainer jaise role ke link par ye page nahi dikhta, seedha usi role ka login khulta hai.
// Links normal <a> hain (poora page load) taaki server us role ka app + install option laga sake.
export default function Welcome() {
  const { user } = useAuth();
  const home = homeOf(user);
  if (user && home !== '/') return <Navigate to={home} replace />;
  if (MODE) return <Navigate to={LOGIN_PATH} replace />;
  return (
    <div className="welcome">
      <div className="brand"><i>A</i><div><b>Amplemind CRM</b><span>{COMPANY}</span></div></div>
      <h1>Welcome back</h1>
      <p className="muted">Choose your login.</p>
      <div className="portals three">
        <a href="/admin" className="portal">
          <span className="pi"><Icon name="shield" /></span>
          <h2>Admin login</h2>
          <p>Customers, payments, employees, salary slips and all logins.</p>
          <span className="go">Continue <Icon name="arrow" /></span>
        </a>
        {DEPARTMENTS.map(d => (
          <a key={d.slug} href={`/${d.slug}`} className="portal emp">
            <span className="pi"><Icon name="user" /></span>
            <h2>{d.label} login</h2>
            <p>{d.desc}</p>
            <span className="go">Continue <Icon name="arrow" /></span>
          </a>))}
      </div>
    </div>
  );
}
