import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api';
import Icon from '../../components/Icon';
import PageHead from '../../components/PageHead';
import { useUI } from '../../components/UI';
import { COMPANY } from '../../config';
import { printQuotation } from '../../printA4';
import { DEFAULT_TERMS, blankItem, calcQuote, itemsOf } from '../../quote';
import { addDays, fmtDate, inr, today, wa } from '../../utils';

const STATUS = ['Draft', 'Sent', 'Accepted', 'Rejected'];
const empty = () => ({ no: '', qdate: today(), valid_till: addDays(15), customer_id: '', client: '', contact: '', client_phone: '', client_address: '', client_gst: '',
  items: [blankItem()], discount_pct: 0, gst_on: true, gst_rate: 18, status: 'Draft', notes: '', terms: DEFAULT_TERMS });

// Quotation banane / badalne ka poora page: customer, products, discount, GST, terms, PDF / Print / WhatsApp
export default function QuotationForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const ui = useUI();
  const [q, setQ] = useState(id ? null : empty());
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errs, setErrs] = useState({});

  useEffect(() => {
    Promise.all([api('GET', 'customers'), api('GET', 'products')]).then(([c, p]) => { setCustomers(c); setProducts(p); }).catch(e => ui.toast(e.message, 'err'));
    if (id) api('GET', 'quotations').then(list => {
      const r = list.find(x => String(x.id) === String(id));
      if (!r) { ui.toast('Quotation not found', 'err'); return nav('/admin/quotations', { replace: true }); }
      setQ({ ...empty(), ...r, customer_id: r.customer_id || '', items: itemsOf(r), gst_on: r.gst_on === null ? false : Number(r.gst_on) === 1,
        gst_rate: r.gst_rate ?? 18, discount_pct: r.discount_pct ?? 0, terms: r.terms ?? DEFAULT_TERMS, notes: r.notes || '', client_address: r.client_address || '' });
    }).catch(e => ui.toast(e.message, 'err'));
    // eslint-disable-next-line
  }, [id]);

  const calc = useMemo(() => (q ? calcQuote(q.items, q.discount_pct, q.gst_on, q.gst_rate) : null), [q]);
  if (!q) return <div className="sk" style={{ height: 80 }} />;

  const set = (k, v) => { setQ(s => ({ ...s, [k]: v })); setErrs(e => ({ ...e, [k]: '' })); };
  const setItem = (i, patch) => setQ(s => ({ ...s, items: s.items.map((it, x) => (x === i ? { ...it, ...patch } : it)) }));
  const addItem = (it = blankItem()) => setQ(s => ({ ...s, items: [...s.items.filter(x => x.name || x.rate), it] }));
  const removeItem = i => setQ(s => ({ ...s, items: s.items.length > 1 ? s.items.filter((_, x) => x !== i) : [blankItem()] }));
  const fromProduct = p => ({ name: p.name, desc: p.description || '', qty: 1, rate: p.price || '', disc: 0 });

  const pickCustomer = v => {
    const c = customers.find(x => String(x.id) === String(v));
    setQ(s => ({ ...s, customer_id: v, ...(c ? { client: c.business || '', contact: c.contact || '', client_phone: c.phone || '', client_address: c.city || s.client_address } : {}) }));
  };
  // Item ka naam product se match ho jaye to rate + description bhar do
  const nameChange = (i, v) => {
    const p = products.find(x => x.name.toLowerCase() === v.toLowerCase());
    setItem(i, p && !q.items[i].rate ? { ...fromProduct(p), name: p.name } : { name: v });
  };

  const payload = () => ({ qdate: q.qdate, valid_till: q.valid_till, customer_id: q.customer_id, client: q.client.trim(), contact: q.contact, client_phone: q.client_phone,
    client_address: q.client_address, client_gst: q.client_gst, items_json: JSON.stringify(q.items), discount_pct: q.discount_pct || 0, gst_on: q.gst_on ? 1 : 0,
    gst_rate: q.gst_rate || 0, status: q.status, notes: q.notes, terms: q.terms });

  // Save karta hai. Naya ho to number mil jata hai. Print / PDF / WhatsApp se pehle bhi yahi chalta hai.
  const save = async (quiet = false) => {
    const e = {};
    if (!q.client.trim()) e.client = 'Client name is required';
    if (!calc.lines.length) e.items = 'Add at least one item with a rate';
    if (Object.keys(e).length) { setErrs(e); ui.toast(e.client || e.items, 'err'); return null; }
    setSaving(true);
    try {
      let cur = q;
      if (q.id) await api('PUT', 'quotations/' + q.id, payload());
      else {
        const { id: nid } = await api('POST', 'quotations', payload());
        const saved = (await api('GET', 'quotations')).find(x => x.id === nid);
        cur = { ...q, id: nid, no: saved ? saved.no : '' };
        setQ(cur);
        nav('/admin/quotations/' + nid, { replace: true });
      }
      if (!quiet) ui.toast('Quotation saved');
      setSaving(false);
      return { ...cur, total: calc.total };
    } catch (er) { ui.toast(er.message, 'err'); setSaving(false); return null; }
  };

  const doPrint = async pdf => {
    const s = await save(true); if (!s) return;
    if (pdf) ui.toast('In the print window choose "Save as PDF" as the printer');
    printQuotation({ ...s, gst_on: s.gst_on ? 1 : 0 });
  };
  const doWhatsApp = async () => {
    const s = await save(true); if (!s) return;
    if (!s.client_phone) return ui.toast('Add the client phone number to send on WhatsApp', 'err');
    const lines = calc.lines.map((l, i) => `${i + 1}. ${l.name}${l.qty > 1 ? ' x' + l.qty : ''} - ${inr(l.amount)}`).join('\n');
    wa(s.client_phone, `Hello ${s.contact || s.client},\n\nQuotation ${s.no} from ${COMPANY}\n\n${lines}\n\nTotal: ${inr(calc.total)}${q.gst_on ? ` (incl. GST ${q.gst_rate}%)` : ' (GST extra)'}\nValid till: ${fmtDate(s.valid_till)}\n\nPlease reply to confirm. Thank you!`);
  };

  return (
    <>
      <PageHead title={q.id ? `Quotation ${q.no}` : 'New quotation'} desc="Pick a customer, add products, set discount and GST. Then save, print or send it on WhatsApp.">
        <button className="btn" onClick={() => nav('/admin/quotations')}><Icon name="back" />Back to list</button>
      </PageHead>

      <div className="qgrid">
        <div>
          <div className="card qcard">
            <h3>Client</h3>
            <div className="fg">
              <div className="w"><label htmlFor="q_cust">Pick a customer or lead (optional)</label>
                <select id="q_cust" value={q.customer_id} onChange={e => pickCustomer(e.target.value)}>
                  <option value="">Select…</option>{customers.map(c => <option key={c.id} value={c.id}>{c.business}{c.contact ? ' – ' + c.contact : ''}</option>)}</select></div>
              <div className={errs.client ? 'e' : ''}><label htmlFor="q_client">Client name</label><input id="q_client" value={q.client} onChange={e => set('client', e.target.value)} />{errs.client && <div className="em">{errs.client}</div>}</div>
              <div><label htmlFor="q_contact">Contact person</label><input id="q_contact" value={q.contact} onChange={e => set('contact', e.target.value)} /></div>
              <div><label htmlFor="q_phone">Phone</label><input id="q_phone" value={q.client_phone} onChange={e => set('client_phone', e.target.value)} /></div>
              <div><label htmlFor="q_gst">Client GST number</label><input id="q_gst" value={q.client_gst} onChange={e => set('client_gst', e.target.value)} /></div>
              <div className="w"><label htmlFor="q_addr">Client address</label><textarea id="q_addr" rows={2} value={q.client_address} onChange={e => set('client_address', e.target.value)} /></div>
              <div><label htmlFor="q_date">Date</label><input id="q_date" type="date" value={q.qdate || ''} onChange={e => set('qdate', e.target.value)} /></div>
              <div><label htmlFor="q_valid">Valid till</label><input id="q_valid" type="date" value={q.valid_till || ''} onChange={e => set('valid_till', e.target.value)} /></div>
            </div>
          </div>

          <div className={'card qcard ' + (errs.items ? 'e' : '')}>
            <div className="qhead"><h3>Items</h3>
              <div className="row-gap">
                <select className="sel" aria-label="Add a product" value="" onChange={e => { const p = products.find(x => String(x.id) === e.target.value); if (p) addItem(fromProduct(p)); }}>
                  <option value="">+ Add product…</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}{p.price ? ' – ' + inr(p.price) : ''}</option>)}</select>
                <button className="btn sm" onClick={() => addItem()}><Icon name="plus" />Add item</button>
              </div>
            </div>
            <datalist id="prod-list">{products.map(p => <option key={p.id} value={p.name} />)}</datalist>
            <div className="qitems">
              <div className="qrow qlabels"><span>Item (pick from products or type)</span><span>Description</span><span>Qty</span><span>Rate (₹)</span><span>Disc. %</span><span className="r">Amount</span><span /></div>
              {q.items.map((it, i) => {
                const amt = (Number(it.qty) || 1) * (Number(it.rate) || 0) * (1 - (Number(it.disc) || 0) / 100);
                return (
                  <div className="qrow" key={i}>
                    <input aria-label="Item" list="prod-list" placeholder="Item name" value={it.name} onChange={e => nameChange(i, e.target.value)} />
                    <input aria-label="Description" placeholder="Description" value={it.desc} onChange={e => setItem(i, { desc: e.target.value })} />
                    <input aria-label="Quantity" placeholder="Qty" type="number" min="1" value={it.qty} onChange={e => setItem(i, { qty: e.target.value })} />
                    <input aria-label="Rate" type="number" min="0" placeholder="Rate ₹" value={it.rate} onChange={e => setItem(i, { rate: e.target.value })} />
                    <input aria-label="Discount percent" placeholder="Disc %" type="number" min="0" max="100" value={it.disc} onChange={e => setItem(i, { disc: e.target.value })} />
                    <b className="r qamt">{inr(amt)}</b>
                    <button className="btn icon del" aria-label="Remove item" onClick={() => removeItem(i)}><Icon name="trash" /></button>
                  </div>);
              })}
            </div>
            {errs.items && <div className="em">{errs.items}</div>}
          </div>

          <div className="card qcard">
            <h3>Notes and terms</h3>
            <div className="fg">
              <div className="w"><label htmlFor="q_notes">Notes for the client (optional)</label><textarea id="q_notes" rows={2} value={q.notes} onChange={e => set('notes', e.target.value)} /></div>
              <div className="w"><label htmlFor="q_terms">Terms and conditions (one per line)</label><textarea id="q_terms" rows={7} value={q.terms} onChange={e => set('terms', e.target.value)} />
                <button type="button" className="btn sm" style={{ marginTop: 6 }} onClick={() => set('terms', DEFAULT_TERMS)}>Reset to default terms</button></div>
            </div>
          </div>
        </div>

        <aside className="qside">
          <div className="card qcard">
            <h3>Summary</h3>
            <div className="fg" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div><label htmlFor="q_disc">Extra discount on total (%)</label><input id="q_disc" type="number" min="0" max="100" value={q.discount_pct} onChange={e => set('discount_pct', e.target.value)} /></div>
              <div><label htmlFor="q_rate">GST rate (%)</label><input id="q_rate" type="number" min="0" value={q.gst_rate} disabled={!q.gst_on} onChange={e => set('gst_rate', e.target.value)} /></div>
              <div className="w"><label className="chk"><input type="checkbox" checked={q.gst_on} onChange={e => set('gst_on', e.target.checked)} /> Add GST</label></div>
              <div className="w"><label htmlFor="q_status">Status</label><select id="q_status" value={q.status} onChange={e => set('status', e.target.value)}>{STATUS.map(s => <option key={s}>{s}</option>)}</select></div>
            </div>
            <div className="sumrows">
              <div><span>Subtotal</span><b>{inr(calc.subtotal)}</b></div>
              {calc.discount > 0 && <div><span>Discount ({Number(q.discount_pct)}%)</span><b>- {inr(calc.discount)}</b></div>}
              {q.gst_on && <div><span>GST ({Number(q.gst_rate) || 0}%)</span><b>{inr(calc.gst)}</b></div>}
              <div className="grand"><span>Total</span><b>{inr(calc.total)}</b></div>
            </div>
          </div>
          <div className="qbtns">
            <button className="btn primary lg" disabled={saving} onClick={() => save()}>{saving ? 'Saving…' : 'Save quotation'}</button>
            <button className="btn" onClick={() => doPrint(true)}><Icon name="download" />Save PDF</button>
            <button className="btn" onClick={() => doPrint(false)}><Icon name="print" />Print PDF</button>
            <button className="btn wa" onClick={doWhatsApp}><Icon name="chat" />Send on WhatsApp</button>
            <button className="btn" onClick={() => nav('/admin/quotations')}>Back to list</button>
          </div>
        </aside>
      </div>
    </>
  );
}