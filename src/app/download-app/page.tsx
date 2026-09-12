import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { getPulseInvitationSettingsByOrgId } from '@/lib/membership/pulse-invitation-settings';

export const dynamic = 'force-dynamic';

export default async function DownloadAppPage({
  searchParams,
}: {
  searchParams: Promise<{ orgId?: string | string[] }>;
}) {
  const params = await searchParams;
  const orgIdValue = Array.isArray(params.orgId) ? params.orgId[0] : params.orgId;
  const orgId = String(orgIdValue || '').trim();

  let ios = String(process.env.NEXT_PUBLIC_OPSIQO_IOS_APP_URL || '').trim();
  let android = String(process.env.NEXT_PUBLIC_OPSIQO_ANDROID_APP_URL || '').trim();
  let landingPath = '/time';
  let webButtonLabel = 'Open Time & Leave';

  if (orgId) {
    try {
      const settings = await getPulseInvitationSettingsByOrgId(orgId);
      ios = settings.iosAppUrl || ios;
      android = settings.androidAppUrl || android;
      landingPath = settings.landingPath;
      webButtonLabel = settings.webButtonLabel;
    } catch {
      // Public download page remains available using environment fallbacks.
    }
  }

  const query = new URLSearchParams();
  if (orgId) query.set('orgId', orgId);
  query.set('returnTo', landingPath);
  const webHref = `/signin?${query.toString()}`;

  return <>
    <PageHeader title="Download OPSIQO" subtitle="Use the same work email and password across OPSIQO web and mobile access." />
    <div className="grid2">
      <section className="card stack">
        <h2 className="sectionTitle">Android</h2>
        <p className="muted">Install the approved OPSIQO Android build for your organization.</p>
        {android
          ? <a className="button" href={android}>{'Download Android app'}</a>
          : <div className="notice">Android distribution is not configured yet. An authorized administrator can add the approved Play Store or UAT distribution URL under Mobile & Invitation Settings.</div>}
      </section>
      <section className="card stack">
        <h2 className="sectionTitle">iPhone / iPad</h2>
        <p className="muted">Install OPSIQO from the approved Apple distribution channel.</p>
        {ios
          ? <a className="button" href={ios}>{'Download iOS app'}</a>
          : <div className="notice">iOS distribution is not configured yet. An authorized administrator can add the approved App Store or TestFlight URL under Mobile & Invitation Settings.</div>}
      </section>
    </div>
    <section className="card stack">
      <h2 className="sectionTitle">Web access</h2>
      <p className="muted">Continue in the browser and go directly to your configured post-invitation workspace.</p>
      <Link className="button secondary" href={webHref}>{webButtonLabel}</Link>
    </section>
  </>;
}
