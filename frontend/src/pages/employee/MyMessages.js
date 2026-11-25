import { api } from '../../api';
import Chat from '../../components/Chat';
import PageHead from '../../components/PageHead';

// Employee ki admin ke saath seedhi chat (kisi bhi query ke liye)
export default function MyMessages() {
  return (
    <>
      <PageHead title="Messages" desc="Ask your admin anything. Task related chats are inside each task." />
      <div className="panel" style={{ padding: 16, maxWidth: 760 }}>
        <Chat me="employee" height={460} placeholder="Type your question or update"
          load={() => api('GET', 'my/messages')} send={body => api('POST', 'my/messages', { body })} empty="No messages yet. Write to your admin here." />
      </div>
    </>
  );
}
