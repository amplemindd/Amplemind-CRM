import { useRef } from 'react';
import { fileToDataUrl } from '../utils';
import { useUI } from './UI';
import Icon from './Icon';

// Photo chunne ka box (preview + Choose / Remove). Photo chhoti hokar JPEG ban jati hai.
// round = gol preview (profile photo), maxPx = photo ka max size
export default function ImagePick({ value, onChange, round = false, maxPx = 400, quality = 0.82, label = 'Choose photo', id }) {
  const ui = useUI();
  const ref = useRef();
  const pick = async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    try { onChange(await fileToDataUrl(f, maxPx, quality)); } catch (er) { ui.toast(er.message, 'err'); }
  };
  return (
    <div className="imgpick">
      <div className={'imgbox ' + (round ? 'round' : '')}>{value ? <img src={value} alt="Preview" /> : <Icon name={round ? 'user' : 'file'} />}</div>
      <div className="imgbtns">
        <input ref={ref} id={id} type="file" accept="image/*" hidden onChange={pick} />
        <button type="button" className="btn sm" onClick={() => ref.current.click()}><Icon name="plus" />{value ? 'Change' : label}</button>
        {value && <button type="button" className="btn sm" onClick={() => onChange('')}>Remove</button>}
      </div>
    </div>
  );
}
