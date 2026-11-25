import { useEffect, useState } from 'react';
import { canInstall, isIOS, isStandalone, promptInstall } from '../push';

// Login page par "Install app" button (Android / Chrome). iPhone par Share > Add to Home Screen ka hint.
export default function InstallButton() {
  const [, tick] = useState(0);
  useEffect(() => {
    const f = () => tick(n => n + 1);
    window.addEventListener('crm-installable', f);
    return () => window.removeEventListener('crm-installable', f);
  }, []);
  if (isStandalone()) return null; // app pehle se install hai
  if (canInstall()) return <button type="button" className="btn lg installbtn" onClick={promptInstall}>Install this app on your phone</button>;
  if (isIOS()) return <p className="hint center">To install: tap Share, then “Add to Home Screen”.</p>;
  return null;
}
