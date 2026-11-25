import { tone } from '../utils';

// Dashboard / follow-up ki ek row: title, sub text, tag aur action buttons
export default function TodoRow({ title, sub, tag, tagTone, actions = [] }) {
  return (
    <div className="todo">
      <div className="main">
        <div className="tags"><b>{title}</b>{tag && <span className={'pill ' + (tagTone || tone(tag))}>{tag}</span>}</div>
        <div className="sub">{sub}</div>
      </div>
      <div className="btns">{actions.map(a => <button key={a.label} className={'btn sm ' + (a.kind || '')} onClick={a.onClick}>{a.label}</button>)}</div>
    </div>
  );
}
