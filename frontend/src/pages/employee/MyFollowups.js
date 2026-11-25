import FollowBoard from '../../components/FollowBoard';
import PageHead from '../../components/PageHead';

export default function MyFollowups() {
  return (
    <>
      <PageHead title="Follow-ups" desc="Your leads that need a call or message. Send, snooze or clear each one." />
      <FollowBoard base="my/customers" />
    </>
  );
}
