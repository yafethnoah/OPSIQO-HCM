'use client';
import Link from 'next/link';
import { useEffect,useMemo,useState } from 'react';
import type { OpsiQoOneOverview,OpsiQoWorkBucket } from '@/domain/opsiqo-one';
import { activeOrgId,apiFetch,isMfaRequiredError } from '@/lib/http/client';
import { mfaSetupHref } from '@/lib/auth/mfa-client';

const buckets:Array<{id:OpsiQoWorkBucket;label:string;helper:string}>=[
  {id:'needs_me',label:'Needs me',helper:'Verified items requiring your attention'},
  {id:'waiting',label:'Waiting',helper:'Approved or submitted work waiting on another step'},
  {id:'ai_working',label:'AI prepared',helper:'Governed AI plans prepared for review'},
  {id:'completed',label:'Completed',helper:'Recently completed or closed work'},
];

export function MyWorkWorkspace(){
 const[data,setData]=useState<OpsiQoOneOverview|null>(null),[bucket,setBucket]=useState<OpsiQoWorkBucket>('needs_me'),[error,setError]=useState(''),[mfa,setMfa]=useState(false);
 useEffect(()=>{let alive=true;apiFetch<{data:OpsiQoOneOverview}>(`/api/organizations/${activeOrgId()}/opsiqo-one/overview`).then(r=>{if(alive)setData(r.data)}).catch(e=>{if(!alive)return;if(isMfaRequiredError(e))setMfa(true);else setError(e instanceof Error?e.message:'Unable to load My Work.')});return()=>{alive=false}},[]);
 const items=useMemo(()=>data?.workQueue.filter(item=>item.bucket===bucket)||[],[data,bucket]);
 if(mfa)return <section className="card stack" data-security-state="mfa-required"><span className="eyebrow">Privileged access security</span><h2 className="sectionTitle">Multi-factor authentication required</h2><p className="muted">The unified work queue is withheld until privileged MFA is satisfied.</p><div><Link className="button" href={mfaSetupHref('/my-work')}>Set up multi-factor authentication</Link></div></section>;
 if(!data)return <section className="card">{error?<div className="error">{error}</div>:<div className="loadingState"><div className="loadingDot"/><div><strong>Building your unified work queue</strong><small>OPSIQO is checking permission-scoped work across connected HR domains.</small></div></div>}</section>;
 return <div className="stack" data-opsiqo-one="my-work">
   <section className="card oneHero"><div><span className="eyebrow">OPSIQO ONE · My Work</span><h1>Everything that needs you, in one place</h1><p className="muted">Cross-module work is grouped by ownership and state so you do not need to hunt through individual HR modules.</p></div><Link className="button secondary" href="/home">Back to My Day</Link></section>
   <section className="workBucketGrid" aria-label="Work queue categories">{buckets.map(item=><button key={item.id} className={`workBucket ${bucket===item.id?'active':''}`} onClick={()=>setBucket(item.id)} aria-pressed={bucket===item.id}><span>{item.label}</span><strong>{data.workCounts[item.id]}</strong><small>{item.helper}</small></button>)}</section>
   <section className="card"><div className="toolbar"><div><h2 className="sectionTitle">{buckets.find(x=>x.id===bucket)?.label}</h2><p className="muted">{buckets.find(x=>x.id===bucket)?.helper}</p></div><span className="badge">{items.length}</span></div>{items.length?<div className="oneWorkList">{items.map(item=><Link className={`oneWorkItem ${item.priority}`} href={item.href} key={item.id}><div><div className="row wrap"><span className={`severityBadge ${item.priority}`}>{item.priority}</span><strong>{item.title}</strong>{item.status&&<span className="badge">{item.status.replaceAll('_',' ')}</span>}</div><p className="muted">{item.summary}</p>{item.dueAt&&<small>Due {item.dueAt.slice(0,10)}</small>}</div><span aria-hidden="true">›</span></Link>)}</div>:<div className="emptyState"><div><strong>No items in this queue</strong><p>OPSIQO has no verified work in this state right now.</p></div></div>}</section>
 </div>;
}
