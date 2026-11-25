import { useAuth } from '../../components/AuthContext';
import ChangePassword from '../../components/ChangePassword';
import Icon from '../../components/Icon';
import PageHead from '../../components/PageHead';
import { useUI } from '../../components/UI';
import { DEPARTMENTS } from '../../config';
import { copyText, deptUrl } from '../../utils';

export default function Settings() {
  const ui = useUI();
  const { user } = useAuth();
  return (
    <>
      <PageHead title="Admin login" desc="Your admin account, password and the login links of every department." />
      <div className="dash">
        <div>
          <ChangePassword />
        </div>
        <div>
          <div className="card">
            <h3>Your account</h3>
            <div className="kv"><span>Name</span><b>{user && user.name}</b></div>
            <div className="kv"><span>Username</span><b>{user && user.username}</b></div>
            <div className="kv"><span>Role</span><b>Administrator</b></div>
          </div>
          <div className="card">
            <h3>Department login links</h3>
            <p className="hint">Create the username and password in <b>Employee logins</b>, then share the right link.</p>
            {DEPARTMENTS.map(d => (
              <div key={d.slug} style={{ marginTop: 10 }}><b>{d.label}</b>
                <div className="linkbox"><code>{deptUrl(d.slug)}</code>
                  <button className="btn sm" onClick={async () => ui.toast((await copyText(deptUrl(d.slug))) ? 'Link copied' : 'Copy failed')}><Icon name="copy" />Copy</button></div></div>))}
          </div>
        </div>
      </div>
    </>
  );
}
