import ListPage from '../../components/ListPage';
import { F, wa } from '../../utils';
import { STAGES, COMPANY } from '../../config';

// Employee ko sirf wahi leads dikhti hain jo admin ne use assign ki hain (ya jo usne khud add ki)
const config = {
  noun: 'lead', primary: 'business', secondary: r => [r.contact, r.phone].filter(Boolean).join(', '), badges: ['stage', 'temperature'],
  filter: { field: 'stage', opts: STAGES }, required: ['business'], noDelete: true,
  title: 'My leads', desc: 'Your leads and customers. Update the stage and follow-up date after every call.',
  fields: [F('business', 'Business'), F('contact', 'Contact person'), F('phone', 'Phone'), F('city', 'City'),
    F('product', 'Product', 'ref', { src: 'my/products' }), F('stage', 'Stage', 'select', { opts: STAGES, def: () => 'Lead' }),
    F('temperature', 'Temperature', 'select', { opts: ['Hot', 'Warm', 'Cold'] }), F('value', 'Value ₹', 'money'),
    F('followup_date', 'Follow-up date', 'date'), F('renewal_date', 'Renewal date', 'date'), F('notes', 'Notes', 'textarea')],
  cols: ['business', 'product', 'stage', 'temperature', 'value', 'followup_date'],
  actions: r => [['WhatsApp', () => wa(r.phone, `Hi ${r.contact || ''}, this is ${COMPANY}. `)]],
};

export default function MyLeads() {
  return <ListPage resource="my/customers" cfg={config} />;
}
