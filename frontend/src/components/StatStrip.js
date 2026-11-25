import { inr } from '../utils';

// items: [[label, value, plain?]]  plain = number/text, warna ₹ format
export default function StatStrip({ items }) {
  return <div className="strip">{items.map(([l, v, plain]) => <div className="stat" key={l}><span>{l}</span><b>{plain ? v : inr(v)}</b></div>)}</div>;
}
