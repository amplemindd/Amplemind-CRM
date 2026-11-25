import ListPage from '../../components/ListPage';
import { F, today } from '../../utils';

const config = {
  noun: 'notice', primary: 'title', required: ['title', 'message'],
  title: 'Notices', desc: 'Post a message for your team. Every employee sees it on their dashboard.',
  fields: [F('title', 'Title'), F('message', 'Message', 'textarea'), F('posted_on', 'Date', 'date', { def: today })],
  cols: ['title', 'message', 'posted_on'],
};

export default function Announcements() {
  return <ListPage resource="announcements" cfg={config} />;
}
