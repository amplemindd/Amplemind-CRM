import { inr } from '../utils';
import Icon from './Icon';

// items: [[label, value, plain?, icon, tone]]  plain = number/text, warna ₹ format
// tone: blue | green | amber | red | violet
export default function StatCards({ items }) {
  return (
    <div className="cards">
      {items.map(([l, v, plain, icon, tone]) => (
        <div className="scard" key={l}>
          <span className={'sico ' + (tone || 'blue')}><Icon name={icon || 'chart'} /></span>
          <div><span>{l}</span><b>{plain ? v : inr(v)}</b></div>
        </div>))}
    </div>
  );
}
