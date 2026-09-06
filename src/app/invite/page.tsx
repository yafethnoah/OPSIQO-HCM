import { PageHeader } from '@/components/page-header';
import { PulseInviteLanding } from '@/components/pulse-invite-landing';

export default function PulseInvitePage() {
  return (
    <>
      <PageHeader
        title="Welcome to OPSIQO Pulse"
        subtitle="Secure employee mobile onboarding and organization activation."
      />
      <PulseInviteLanding />
    </>
  );
}