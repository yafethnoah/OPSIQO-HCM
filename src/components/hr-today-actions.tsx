'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
type BriefItem={id:string;title:string;summary:string;href:string;severity:string;dueAt?:string};

const severityScore=(severity:string)=>severity==='critical'?400:severity==='high'?300:severity==='medium'?200:severity==='warning'?180:100;
const dueScore=(dueAt?:string)=>{if(!dueAt)return 0;const delta=new Date(dueAt).getTime()-Date.now();if(!Number.isFinite(delta))return 0;const days=delta/86400000;return days<0?120:days<=1?100:days<=7?60:days<=30?30:0;};

export function HrTodayActions({needsAction,approaching}:{needsAction:BriefItem[];approaching:BriefItem[]}){
 const[dismissed,setDismissed]=useState<string[]>([]);
 const ranked=useMemo(()=>{const seen=new Set<string>();return [...needsAction,...approaching].filter(item=>{if(seen.has(item.id)||dismissed.includes(item.id))return false;seen.add(item.id);return true;}).sort((a,b)=>(severityScore(String(b.severity))+dueScore(b.dueAt))-(severityScore(String(a.severity))+dueScore(a.dueAt))).slice(0,8);},[needsAction,approaching,dismissed]);
 return <section className="card stack" data-opsiqo-hr-today="true">
  <div className="runHeader"><div><span className="eyebrow">HR TODAY · INTELLIGENT COMMAND CENTRE</span><h2 className="sectionTitle">What needs attention now</h2><p className="muted">Ranked from verified OPSIQO work evidence. Open the underlying record before approving or executing any consequential employment action.</p></div><Link href="/my-work" className="button secondary">Review all work</Link></div>
  {!ranked.length?<div className="success">No verified priority items are waiting in the current HR Today queue.</div>:ranked.map((item,index)=><article className={`oneWorkItem ${item.severity}`} key={item.id}><div style={{flex:1}}><div className="row wrap"><strong>#{index+1} · {item.title}</strong><span className="badge">{String(item.severity).replaceAll('_',' ')}</span>{item.dueAt?<span className="badge">Due {item.dueAt}</span>:null}</div><p className="muted">{item.summary}</p><small>Source: governed Daily Brief evidence · action requires normal permission and approval controls.</small></div><div className="stepActions"><Link className="button compact" href={item.href}>Review individually</Link><button type="button" className="button secondary compact" onClick={()=>setDismissed(current=>[...current,item.id])}>Dismiss from today</button></div></article>)}
  <div className="notice"><strong>Bulk execution safeguard:</strong> OPSIQO does not bulk-approve hiring, termination, discipline, compensation, accommodation or other consequential decisions. Low-risk automatic execution is permitted only through an explicit governed automation/action contract.</div>
 </section>;
}
