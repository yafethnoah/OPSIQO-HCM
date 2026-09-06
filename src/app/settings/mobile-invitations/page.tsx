import Link from 'next/link';
import { PulseInvitationSettingsEditor } from '@/components/pulse-invitation-settings-editor';

export default function MobileInvitationSettingsPage() {
  return (
    <div className="stack">
      <div className="pageHeader">
        <div>
          <span className="eyebrow">Settings / Mobile</span>
          <h1>OPSIQO Pulse Invitations</h1>
          <p>
            Edit employee invitation content and manage iOS / Android distribution links without changing application code.
          </p>
        </div>
        <Link className="button secondary" href="/settings">Back to settings</Link>
      </div>
      <PulseInvitationSettingsEditor />
    </div>
  );
}