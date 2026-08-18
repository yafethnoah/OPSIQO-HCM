'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  EmailAuthProvider,
  TotpMultiFactorGenerator,
  multiFactor,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signOut,
  type TotpSecret,
  type User,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { AuthBrand } from '@/components/auth-brand';
import { LoadingState } from '@/components/data-states';
import { firebaseAuth } from '@/lib/firebase/client';
import { friendlyTotpError, sanitizeInternalReturnTo } from '@/lib/auth/mfa-client';

function requestedReturnTo(): string {
  if (typeof window === 'undefined') return '/dashboard';
  return sanitizeInternalReturnTo(new URLSearchParams(window.location.search).get('returnTo'), '/dashboard');
}

export default function MfaSetupPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [secret, setSecret] = useState<TotpSecret | null>(null);
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [displayName, setDisplayName] = useState('Authenticator app');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const returnTo = useMemo(() => requestedReturnTo(), []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth(), (current) => {
      setUser(current);
      setChecking(false);
    });
    return () => {
      setSecret(null);
      setOtp('');
      setPassword('');
      unsubscribe();
    };
  }, []);

  const passwordProvider = Boolean(user?.providerData.some((provider) => provider.providerId === 'password'));
  const factors = user ? multiFactor(user).enrolledFactors : [];

  async function beginEnrollment() {
    if (!user) return;
    setError('');
    setBusy(true);
    setSecret(null);
    setOtp('');
    try {
      if (!user.emailVerified) throw new Error('Verify your email address before setting up multi-factor authentication.');
      if (passwordProvider) {
        if (!user.email || !password) throw new Error('Enter your current password to reauthenticate before enrollment.');
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
        setPassword('');
      }
      const session = await multiFactor(user).getSession();
      const generated = await TotpMultiFactorGenerator.generateSecret(session);
      setSecret(generated);
    } catch (e) {
      setError(friendlyTotpError(e, 'Multi-factor enrollment could not be started.'));
    } finally {
      setBusy(false);
    }
  }

  async function completeEnrollment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user || !secret) return;
    setError('');
    setBusy(true);
    try {
      const code = otp.trim();
      if (!/^\d{6}$/.test(code)) throw new Error('Enter the 6-digit code from your authenticator app.');
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, code);
      await multiFactor(user).enroll(assertion, displayName.trim() || 'Authenticator app');
      setSecret(null);
      setOtp('');
      setPassword('');
      await user.getIdToken(true);

      // The privileged OPSIQO server gate requires proof that this sign-in itself
      // completed MFA. A newly enrolled factor should therefore be exercised on a
      // fresh sign-in rather than assuming enrollment alone upgrades this session.
      await signOut(firebaseAuth());
      const signInTarget = `/signin?returnTo=${encodeURIComponent(returnTo)}&mfaEnrolled=true`;
      router.replace(signInTarget);
    } catch (e) {
      setError(friendlyTotpError(e, 'The authenticator could not be enrolled.'));
    } finally {
      setBusy(false);
    }
  }

  function cancelEnrollment() {
    setSecret(null);
    setOtp('');
    setPassword('');
    setError('');
  }

  if (checking) return <div className="authShell"><section className="authFormPanel"><div className="authCard"><LoadingState label="Checking your secure session…"/></div></section></div>;

  if (!user) return <div className="authShell"><section className="authBrandPanel"><AuthBrand eyebrow="Privileged access security"/></section><section className="authFormPanel"><div className="authCard stack"><h1>Sign in required</h1><p className="muted">Sign in before configuring multi-factor authentication.</p><Link className="button" href={`/signin?returnTo=${encodeURIComponent(`/mfa/setup?returnTo=${encodeURIComponent(returnTo)}`)}`}>Sign in securely</Link></div></section></div>;

  if (!user.emailVerified) return <div className="authShell"><section className="authBrandPanel"><AuthBrand eyebrow="Privileged access security"/></section><section className="authFormPanel"><div className="authCard stack"><h1>Verify your email first</h1><p className="muted">Firebase requires a verified email before a second factor can be enrolled.</p><div className="error" role="alert">Your signed-in email is not verified. Verify it, sign in again, then return to MFA setup.</div><Link className="button secondary" href="/signin">Return to sign in</Link></div></section></div>;

  const totpUri = secret ? secret.generateQrCodeUrl(user.email || user.uid, 'OPSIQO HCM') : '';

  return <div className="authShell">
    <section className="authBrandPanel"><AuthBrand eyebrow="Privileged access security"/><div className="authTrustGrid"><div><strong>Human verified</strong><span>A second factor is required before privileged HR data is released.</span></div><div><strong>No secret logging</strong><span>Authenticator secrets and codes remain only in the active browser enrollment flow.</span></div><div><strong>Fresh session</strong><span>After enrollment, OPSIQO requires a new sign-in that actually proves the second factor.</span></div></div></section>
    <section className="authFormPanel"><div className="authCard stack">
      <div><span className="authKicker">Multi-factor authentication</span><h1>Set up an authenticator app</h1><p className="muted">Signed in as {user.email || user.uid}</p></div>
      {factors.length > 0 && <section className="stack"><h2 className="sectionTitle">Enrolled factors</h2>{factors.map((factor) => <div className="settingValue" key={factor.uid}><span>{factor.factorId === TotpMultiFactorGenerator.FACTOR_ID ? 'Authenticator app' : factor.factorId}</span><strong>{factor.displayName || 'Second factor'}</strong></div>)}</section>}
      {!secret ? <section className="stack">
        <p>Use a time-based one-time password (TOTP) authenticator. OPSIQO will ask you for a fresh 6-digit code when you sign in to privileged access.</p>
        {passwordProvider && <label className="field"><span>Current password</span><input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy}/></label>}
        {!passwordProvider && <div className="notice">Your identity provider may require a recent sign-in before Firebase allows enrollment. If prompted, sign out and authenticate again with your approved provider.</div>}
        {error && <div className="error" role="alert">{error}</div>}
        <button className="button" onClick={beginEnrollment} disabled={busy}>{busy ? 'Preparing secure enrollment…' : 'Begin authenticator setup'}</button>
        <Link className="button secondary" href={returnTo}>Cancel</Link>
      </section> : <form className="stack" onSubmit={completeEnrollment}>
        <div className="notice">Add the account to your authenticator app using the URI below or the manual secret key. Do not share either value.</div>
        <label className="field"><span>Authenticator-compatible URI</span><textarea className="input" readOnly rows={4} value={totpUri}/></label>
        <label className="field"><span>Manual secret key</span><input className="input" readOnly value={secret.secretKey}/></label>
        <label className="field"><span>Factor name</span><input className="input" value={displayName} maxLength={80} onChange={(e) => setDisplayName(e.target.value)} disabled={busy}/></label>
        <label className="field"><span>6-digit authenticator code</span><input className="input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} required disabled={busy}/></label>
        {error && <div className="error" role="alert">{error}</div>}
        <button className="button" disabled={busy}>{busy ? 'Verifying and enrolling…' : 'Verify & enable MFA'}</button>
        <button className="button secondary" type="button" onClick={cancelEnrollment} disabled={busy}>Cancel enrollment</button>
      </form>}
    </div></section>
  </div>;
}
