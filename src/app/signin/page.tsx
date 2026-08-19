'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  OAuthProvider,
  SAMLAuthProvider,
  TotpMultiFactorGenerator,
  getMultiFactorResolver,
  getRedirectResult,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithRedirect,
  type MultiFactorError,
  type MultiFactorResolver,
  type User,
} from 'firebase/auth';
import { getToken as getAppCheckToken } from 'firebase/app-check';
import { useRouter } from 'next/navigation';
import { AuthBrand } from '@/components/auth-brand';
import { firebaseAppCheck, firebaseAuth } from '@/lib/firebase/client';
import { apiFetch, isMfaRequiredError, setActiveOrgId } from '@/lib/http/client';
import { friendlyTotpError, isFirebaseMfaRequiredError, mfaSetupHref, sanitizeInternalReturnTo } from '@/lib/auth/mfa-client';
import { invitationContextFromReturnTo } from '@/lib/auth/invitation-client';

type PublicProvider = { name:string; protocol:'oidc'|'saml'; firebaseProviderId:string; jitMode:string };
type Policy={registrationMode:'invite_only'|'open_auth_only'|'disabled';guestAccessEnabled:boolean;allowPasswordSignIn:boolean;allowSelfPasswordReset:boolean};

function requestedReturnTo(){
  if(typeof window==='undefined')return'';
  const value=new URLSearchParams(window.location.search).get('returnTo');
  return value ? sanitizeInternalReturnTo(value, '') : '';
}
function safeReturnTo(){return requestedReturnTo()||(process.env.NEXT_PUBLIC_OPSIQO_DEMO_MODE==='true'?'/dashboard':'/setup')}
async function signedInLanding(orgId:string){
  const requested=requestedReturnTo();
  if(requested)return requested;
  if(process.env.NEXT_PUBLIC_OPSIQO_DEMO_MODE==='true')return'/dashboard';
  if(!orgId)return'/setup';
  setActiveOrgId(orgId);
  try{
    const me=await apiFetch<{actor:{role:string}}>('/api/me');
    if(me.actor.role==='employee')return'/employee';
    if(me.actor.role==='manager')return'/manager';
    return'/dashboard';
  }catch(e){
    if(isMfaRequiredError(e))return mfaSetupHref('/dashboard');
    return'/home';
  }
}
function orgContext(){if(typeof window==='undefined')return'';const params=new URLSearchParams(window.location.search);const direct=String(params.get('orgId')||'').trim();if(/^[A-Za-z0-9._-]{2,200}$/.test(direct))return direct;const invitation=invitationContextFromReturnTo(requestedReturnTo());if(invitation)return invitation.orgId;const fallback=process.env.NEXT_PUBLIC_OPSIQO_DEFAULT_ORG_ID||process.env.NEXT_PUBLIC_OPSIQO_ORG_ID||'';return /^[A-Za-z0-9._-]{2,200}$/.test(fallback)?fallback:''}
async function jitIfConfigured(user:{getIdToken():Promise<string>},orgId:string){if(!orgId)return{status:'not_configured'};const token=await user.getIdToken(),headers:Record<string,string>={authorization:`Bearer ${token}`},appCheck=firebaseAppCheck();if(appCheck)headers['x-firebase-appcheck']=(await getAppCheckToken(appCheck,false)).token;const response=await fetch(`/api/identity/jit/${encodeURIComponent(orgId)}`,{method:'POST',headers});const body=await response.json().catch(()=>({})) as{data?:{status?:string;requestId?:string};message?:string};if(!response.ok)throw new Error(body.message||'Identity access evaluation could not be completed.');return body.data||{status:'unknown'}}

export default function SignInPage(){
  const router=useRouter();
  const[error,setError]=useState('');
  const[notice,setNotice]=useState('');
  const[providers,setProviders]=useState<PublicProvider[]>([]);
  const[policy,setPolicy]=useState<Policy>({registrationMode:'invite_only',guestAccessEnabled:false,allowPasswordSignIn:true,allowSelfPasswordReset:true});
  const[checking,setChecking]=useState(true);
  const[busy,setBusy]=useState(false);
  const[mfaResolver,setMfaResolver]=useState<MultiFactorResolver|null>(null);
  const[mfaFactorUid,setMfaFactorUid]=useState('');
  const[mfaOtp,setMfaOtp]=useState('');
  const orgId=useMemo(()=>orgContext(),[]);

  function beginMfaChallenge(e:unknown):boolean{
    if(!isFirebaseMfaRequiredError(e))return false;
    try{
      const resolver=getMultiFactorResolver(firebaseAuth(),e as MultiFactorError);
      const totpHints=resolver.hints.filter((hint)=>hint.factorId===TotpMultiFactorGenerator.FACTOR_ID);
      if(!totpHints.length){
        setError('This account requires a second factor that this OPSIQO sign-in screen does not support. Contact your administrator.');
        setMfaResolver(null);
        return true;
      }
      setMfaResolver(resolver);
      setMfaFactorUid(totpHints[0]!.uid);
      setMfaOtp('');
      setError('');
      setNotice('Password or SSO verification succeeded. Enter the current code from your authenticator app to complete secure sign-in.');
      return true;
    }catch(resolveError){
      setError(friendlyTotpError(resolveError,'The multi-factor sign-in challenge could not be started.'));
      return true;
    }
  }

  async function finishUser(user:User){
    const requested=requestedReturnTo();
    const invitationContext=invitationContextFromReturnTo(requested);
    if(invitationContext){router.push(requested);return;}
    const jit=await jitIfConfigured(user,orgId);
    if(jit?.status==='approval_required'){
      setNotice(`Your identity is verified. Access request ${jit.requestId||''} is awaiting independent approval.`);
      return;
    }
    if(orgId)setActiveOrgId(orgId);
    router.push(await signedInLanding(orgId));
  }

  useEffect(()=>{
    let live=true;
    (async()=>{
      try{
        const auth=firebaseAuth();
        const result=await getRedirectResult(auth);
        if(result?.user){
          await finishUser(result.user);
          return;
        }
        if(typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('mfaEnrolled')==='true'){
          if(live)setNotice('Authenticator enrollment is complete. Sign in again and enter your TOTP code to establish a privileged MFA-verified session.');
        }
        const[providerResponse,policyResponse]=await Promise.all([
          orgId?fetch(`/api/identity/providers/public?orgId=${encodeURIComponent(orgId)}`,{cache:'no-store'}):Promise.resolve(null),
          fetch(`/api/public/registration-policy${orgId?`?orgId=${encodeURIComponent(orgId)}`:''}`,{cache:'no-store'}),
        ]);
        if(providerResponse?.ok){const body=await providerResponse.json() as{data?:PublicProvider[]};if(live)setProviders(body.data||[])}
        if(policyResponse.ok){const body=await policyResponse.json() as{data?:Policy};if(live&&body.data)setPolicy(body.data)}
      }catch(e){
        if(live&&!beginMfaChallenge(e))setError(e instanceof Error?e.message:'Sign-in initialization failed.');
      }finally{if(live)setChecking(false)}
    })();
    return()=>{live=false};
  // finishUser intentionally uses stable router/orgId values for this page lifecycle.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[orgId,router]);

  if(process.env.NEXT_PUBLIC_OPSIQO_DEMO_MODE==='true')return <div className="authShell"><section className="authBrandPanel"><AuthBrand eyebrow="Demo workspace"/></section><section className="authFormPanel"><div className="authCard"><h1>Demo mode active</h1><p className="muted">Sign-in is intentionally bypassed for local/demo testing.</p><button className="button" onClick={()=>router.push(safeReturnTo())}>Continue</button></div></section></div>;

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!policy.allowPasswordSignIn)return;
    setError('');setNotice('');setBusy(true);
    const form=new FormData(e.currentTarget);
    try{
      const result=await signInWithEmailAndPassword(firebaseAuth(),String(form.get('email')),String(form.get('password')));
      await finishUser(result.user);
    }catch(e){
      if(!beginMfaChallenge(e))setError(e instanceof Error?e.message:'Sign-in failed.');
    }finally{setBusy(false)}
  }

  async function completeMfa(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!mfaResolver)return;
    setBusy(true);setError('');
    try{
      const hint=mfaResolver.hints.find((candidate)=>candidate.uid===mfaFactorUid);
      if(!hint||hint.factorId!==TotpMultiFactorGenerator.FACTOR_ID)throw new Error('Select an enrolled authenticator factor.');
      const code=mfaOtp.trim();
      if(!/^\d{6}$/.test(code))throw new Error('Enter the 6-digit code from your authenticator app.');
      const assertion=TotpMultiFactorGenerator.assertionForSignIn(hint.uid,code);
      const credential=await mfaResolver.resolveSignIn(assertion);
      setMfaResolver(null);setMfaOtp('');setMfaFactorUid('');
      await credential.user.getIdToken(true);
      await finishUser(credential.user);
    }catch(e){
      setError(friendlyTotpError(e,'Multi-factor sign-in failed.'));
    }finally{setBusy(false)}
  }

  async function guest(){if(!orgId||!policy.guestAccessEnabled)return;setBusy(true);setError('');try{await signInAnonymously(firebaseAuth());setActiveOrgId(orgId);router.push('/organization')}catch(e){setError(e instanceof Error?e.message:'Guest access could not be started.')}finally{setBusy(false)}}
  async function sso(p:PublicProvider){try{setError('');const provider=p.protocol==='saml'?new SAMLAuthProvider(p.firebaseProviderId):new OAuthProvider(p.firebaseProviderId);await signInWithRedirect(firebaseAuth(),provider)}catch(e){setError(e instanceof Error?e.message:'SSO sign-in could not start.')}}

  return <div className="authShell"><section className="authBrandPanel"><AuthBrand eyebrow="Secure workforce intelligence"/><div className="authTrustGrid"><div><strong>Evidence aware</strong><span>Readiness is separated from evidence sufficiency.</span></div><div><strong>Human governed</strong><span>Consequential employment decisions remain human-authorized.</span></div><div><strong>Audit ready</strong><span>Organization boundaries and privileged actions remain traceable.</span></div></div></section><section className="authFormPanel">
    {mfaResolver ? <form className="authCard stack" onSubmit={completeMfa}><div><span className="authKicker">Second factor required</span><h1>Verify your authenticator</h1><p className="muted">Complete the MFA challenge before OPSIQO releases privileged HR access.</p></div>{mfaResolver.hints.filter((hint)=>hint.factorId===TotpMultiFactorGenerator.FACTOR_ID).length>1&&<label className="field"><span>Authenticator factor</span><select className="input" value={mfaFactorUid} onChange={(e)=>setMfaFactorUid(e.target.value)}>{mfaResolver.hints.filter((hint)=>hint.factorId===TotpMultiFactorGenerator.FACTOR_ID).map((hint)=><option value={hint.uid} key={hint.uid}>{hint.displayName||'Authenticator app'}</option>)}</select></label>}<label className="field"><span>6-digit authenticator code</span><input className="input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={mfaOtp} onChange={(e)=>setMfaOtp(e.target.value.replace(/\D/g,'').slice(0,6))} required autoFocus/></label>{error&&<div className="error" role="alert">{error}</div>}{notice&&<div className="notice" role="status">{notice}</div>}<button className="button" disabled={busy}>{busy?'Verifying second factor…':'Verify & continue'}</button><button type="button" className="button secondary" disabled={busy} onClick={()=>{setMfaResolver(null);setMfaFactorUid('');setMfaOtp('');setError('');setNotice('')}}>Use a different sign-in</button></form> : <form className="authCard stack" onSubmit={submit}><div><span className="authKicker">Secure access</span><h1>Sign in to OPSIQO</h1><p className="muted">Use your approved organization identity to continue.</p></div>{!policy.allowPasswordSignIn&&<div className="notice">Email/password sign-in is disabled by organization policy. Use an approved SSO provider.</div>}<label className="field"><span>Email</span><input className="input" name="email" type="email" autoComplete="email" required disabled={!policy.allowPasswordSignIn}/></label><label className="field"><span>Password</span><input className="input" name="password" type="password" autoComplete="current-password" required disabled={!policy.allowPasswordSignIn}/></label>{error&&<div className="error" role="alert">{error}</div>}{notice&&<div className="notice" role="status">{notice}</div>}<button className="button" disabled={busy||!policy.allowPasswordSignIn}>{busy?'Signing in…':'Sign in securely'}</button><div className="authLinks">{policy.allowSelfPasswordReset&&<Link href={`/forgot-password${orgId?`?orgId=${encodeURIComponent(orgId)}`:''}`}>Forgot password?</Link>}{policy.registrationMode==='open_auth_only'&&<Link href={`/register${orgId?`?orgId=${encodeURIComponent(orgId)}`:''}`}>Register account</Link>}</div>{policy.guestAccessEnabled&&orgId&&<button type="button" className="button secondary" disabled={busy} onClick={guest}>Continue as read-only guest</button>}{checking&&<p className="muted authInlineStatus">Checking approved enterprise identity providers…</p>}</form>}
    {!mfaResolver&&!checking&&providers.length>0&&<section className="authCard stack"><h2 className="sectionTitle">Enterprise SSO</h2>{providers.map(p=><button key={p.firebaseProviderId} className="button secondary" onClick={()=>sso(p)}>Continue with {p.name}</button>)}<p className="muted">Federation is shown only for active, approved provider profiles. JIT access remains governed.</p></section>}
  </section></div>;
}
