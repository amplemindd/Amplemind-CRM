import ListPage from '../../components/ListPage';
import { F, today } from '../../utils';

const config = {
  noun: 'campaign', primary: 'name', secondary: r => r.channel, required: ['name'],
  title: 'Campaigns', desc: 'Meta / other ad campaigns, spend and leads.',
  fields: [F('name', 'Campaign'), F('channel', 'Channel', 'select', { opts: ['Meta Ads', 'Google Ads', 'WhatsApp', 'Other'] }),
    F('spend', 'Spend ₹', 'money'), F('leads', 'Leads', 'number'), F('start_date', 'Start date', 'date', { def: today })],
  cols: ['name', 'spend', 'leads', 'start_date'],
};

// base = 'campaigns' (admin) ya 'dm/campaigns' (Digital Marketing login)
export default function Campaigns({ base = 'campaigns' }) {
  return <ListPage resource={base} cfg={config} />;
}
