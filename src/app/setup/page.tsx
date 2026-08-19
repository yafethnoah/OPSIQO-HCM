'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { AuthBrand } from '@/components/auth-brand';
import { LoadingState } from '@/components/data-states';
import { SessionControls } from '@/components/session-controls';
import { firebaseAuth } from '@/lib/firebase/client';
import { apiFetch, setActiveOrgId } from '@/lib/http/client';

type ExistingOrg = { orgId:string; name:string; role:string; status:string };
type SetupResult = { data:{ orgId:string; organization:{ name:string } } };

export default function SetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => onAuthStateChanged(firebaseAuth(), (user) => {
    setSignedIn(Boolean(user));
    setEmail(user?.email || '');
    if (!user) { setChecking(false); return; }
    apiFetch<{data:ExistingOrg[]}>('/api/me/organizations', { orgContext:'omit' })
      .then((result) => {
        const existing = result.data[0];
        if (existing) {
          setActiveOrgId(existing.orgId);
          router.replace('/dashboard');
          return;
        }
        setChecking(false);
      })
      .catch((e) => { setError(e instanceof Error ? e.message : 'Unable to check organization access.'); setChecking(false); });
  }), [router]);

  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(''); setSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      const result = await apiFetch<SetupResult>('/api/setup', {
        method:'POST',
        orgContext:'omit',
        body:JSON.stringify({ organizationName:form.get('organizationName'), firstName:form.get('firstName'), lastName:form.get('lastName') }),
      });
      setActiveOrgId(result.data.orgId);
      router.replace('/dashboard');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Organization setup failed.');
    } finally { setSubmitting(false); }
  }

  return <div className="authShell">
    <section className="authBrandPanel">
      <AuthBrand eyebrow="Organization foundation"/>
      <div className="authTrustGrid">
        <div><strong>One-time bootstrap</strong><span>The first tenant claim is server guarded and transactional.</span></div>
        <div><strong>Admin foundation</strong><span>Creates the initial organization, worker, position and org-admin membership.</span></div>
        <div><strong>Audit evidence</strong><span>The bootstrap event is written to the organization audit trail.</span></div>
      </div>
    </section>
    <section className="authFormPanel">
      {checking ? <div className="authCard"><LoadingState label="Checking your organization access…"/></div> : !signedIn ? <section className="authCard stack"><div><span className="authKicker">First organization</span><h1>Set up OPSIQO</h1></div><p>Sign in with the authorized bootstrap administrator account before creating the first organization.</p>{error && <div className="error">{error}</div>}<div><Link className="button" href="/signin?returnTo=/setup">Sign in to continue</Link></div></section> : <form className="authCard stack" onSubmit={submit}>
        <div><span className="authKicker">First organization</span><h1>Create your OPSIQO organization</h1><p className="muted">This one-time action establishes the tenant, initial administrator identity and authoritative organization foundation.</p></div>
        <label className="field"><span>Authenticated administrator</span><input className="input" value={email} disabled /></label>
        <SessionControls label="Sign out / use a different account" />
        <label className="field"><span>Organization name</span><input className="input" name="organizationName" required minLength={2} maxLength={120} placeholder="Your organization" /></label>
        <div className="formGrid">
          <label className="field"><span>Administrator first name</span><input className="input" name="firstName" required maxLength={80}/></label>
          <label className="field"><span>Administrator last name</span><input className="input" name="lastName" required maxLength={80}/></label>
        </div>
        {error && <div className="error">{error}</div>}
        <button className="button" disabled={submitting}>{submitting ? 'Creating organization…' : 'Create organization securely'}</button>
        <p className="muted">Local emulator mode allows the first authenticated identity to claim an empty environment. Production still requires the configured bootstrap administrator. After successful production creation, disable <code>OPSIQO_ALLOW_FIRST_ORG_BOOTSTRAP</code>.</p>
      </form>}
    </section>
  </div>;
}
