import { useEffect, useState } from 'react';
import { MODE } from '../appMode';
import { canInstall, isIOS, isStandalone, promptInstall } from '../push';

// Login page par "Install app" button (Android / Chrome). Button na aaye to browser menu se install karne ka hint.
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
  if (MODE) return <p className="hint center">To install: open the browser menu (⋮), then tap “Install app”.</p>;
  return null;
}