import Link from 'next/link';
import { PageHeader } from '@/components/page-header';

export default function DownloadAppPage() {
  const android = String(process.env.NEXT_PUBLIC_OPSIQO_ANDROID_APP_URL || '').trim();
  const ios = String(process.env.NEXT_PUBLIC_OPSIQO_IOS_APP_URL || '').trim();
  return <>
    <PageHeader title="Download OPSIQO" subtitle="Use the same work email and password across OPSIQO web and mobile access." />
    <div className="grid2">
      <section className="card stack">
        <h2 className="sectionTitle">Android</h2>
        <p className="muted">Install the approved OPSIQO Android build for your organization.</p>
        {android ? <a className="button" href={android}>Download Android app</a> : <div className="notice">Android distribution is not configured yet. Your administrator can add the approved Play Store or UAT distribution URL without changing the invitation workflow.</div>}
      </section>
      <section className="card stack">
        <h2 className="sectionTitle">iPhone / iPad</h2>
        <p className="muted">Install OPSIQO from the approved Apple distribution channel.</p>
        {ios ? <a className="button" href={ios}>Download iOS app</a> : <div className="notice">iOS distribution is not configured yet. Your administrator can add the approved App Store or TestFlight URL later.</div>}
      </section>
    </div>
    <section className="card stack">
      <h2 className="sectionTitle">Web access</h2>
      <p className="muted">You can continue using OPSIQO in the browser while mobile distribution is being prepared.</p>
      <Link className="button secondary" href="/signin">Open OPSIQO sign in</Link>
    </section>
  </>;
}
