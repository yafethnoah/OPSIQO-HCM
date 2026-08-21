'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { OpsiQoCommandResult } from '@/domain/opsiqo-one';
import { activeOrgId, apiFetch, isMfaRequiredError } from '@/lib/http/client';
import { mfaSetupHref } from '@/lib/auth/mfa-client';
import { shellText,useShellLocale } from '@/lib/opsiqo-one/shell-i18n';

const suggestions=[
  'Show what needs my attention today',
  'Who is on vacation next week?',
  'Show training that is overdue',
  'Why is turnover changing?',
];

export function OpsiQoCommandBar(){
  const pathname=usePathname();
  const shellLocale=useShellLocale();
  const[command,setCommand]=useState('');
  const[result,setResult]=useState<OpsiQoCommandResult|null>(null);
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState('');
  const[mfaRequired,setMfaRequired]=useState(false);
  const[expanded,setExpanded]=useState(false);

  const submit=async(event?:FormEvent)=>{
    event?.preventDefault();
    const value=command.trim();if(value.length<3)return;
    setBusy(true);setError('');setResult(null);setMfaRequired(false);
    try{
      const response=await apiFetch<{data:OpsiQoCommandResult}>(`/api/organizations/${activeOrgId()}/opsiqo-one/command`,{method:'POST',body:JSON.stringify({command:value})});
      setResult(response.data);setExpanded(true);
    }catch(e){if(isMfaRequiredError(e)){setMfaRequired(true);setExpanded(true)}else setError(e instanceof Error?e.message:'Unable to ask OPSIQO.');}
    finally{setBusy(false)}
  };

  const aiRun=result?.aiRun as any;
  return <section className={`opsiqoCommand ${expanded?'expanded':''}`} aria-label={shellText('Ask OPSIQO',shellLocale)} data-opsiqo-one="command-center">
    <form className="opsiqoCommandForm" onSubmit={submit}>
      <div className="opsiqoCommandMark" aria-hidden="true">✦</div>
      <label className="srOnly" htmlFor="opsiqo-command-input">{shellText('Ask OPSIQO or tell it what to do…',shellLocale)}</label>
      <input id="opsiqo-command-input" className="opsiqoCommandInput" value={command} onChange={e=>setCommand(e.target.value)} onFocus={()=>setExpanded(true)} placeholder={shellText('Ask OPSIQO or tell it what to do…',shellLocale)} autoComplete="off" />
      <button className="button opsiqoCommandSubmit" disabled={busy||command.trim().length<3}>{busy?shellText('Working…',shellLocale):shellText('Ask OPSIQO',shellLocale)}</button>
      {expanded&&<button type="button" className="opsiqoCommandClose" onClick={()=>{setExpanded(false);setResult(null);setError('');setMfaRequired(false)}} aria-label={shellText('Close OPSIQO command details',shellLocale)}>×</button>}
    </form>
    {expanded&&<div className="opsiqoCommandPanel">
      {!result&&!error&&!mfaRequired&&<div className="opsiqoCommandSuggestions"><div><strong>{shellText('Outcome-first help',shellLocale)}</strong><span className="muted">{shellText('Ask naturally. OPSIQO routes, explains or prepares work within your permissions.',shellLocale)}</span></div><div className="row wrap">{suggestions.map(item=><button type="button" className="commandSuggestion" key={item} onClick={()=>setCommand(item)}>{item}</button>)}</div></div>}
      {mfaRequired&&<div className="commandResult high"><div><strong>Multi-factor authentication required</strong><p>Privileged OPSIQO information is withheld until the required second factor is completed.</p></div><Link className="button" href={mfaSetupHref(pathname)}>Set up MFA</Link></div>}
      {error&&<div className="error" role="alert">{error}</div>}
      {result&&<div className={`commandResult ${result.risk==='consequential'?'high':''}`}>
        <div className="commandResultBody"><div className="row wrap"><span className={`actionLevel level-${result.actionLevel}`}>{result.actionLevel}</span><span className="badge">{result.mode}</span>{result.requiresHumanDecision&&<span className="badge">human review</span>}{result.cortexPlan?.shadowMode&&<span className="badge">shadow mode</span>}</div><strong>{result.title}</strong><p>{result.message}</p>
        {result.analytics&&<div className="commandAiAnswer"><strong>Governed analytics answer</strong><p>{result.analytics.summary}</p><div className="row wrap">{result.analytics.metrics.map(metric=><span className="badge" key={metric.key}>{metric.label}: {metric.value}{metric.unit==='percent'?'%':''}</span>)}</div><small>Data quality {result.analytics.dataQualityScore}% · {result.analytics.historyPoints} history point(s)</small>{result.analytics.warnings.length>0&&<p className="muted">{result.analytics.warnings.join(' · ')}</p>}</div>}
        {result.executionReceipt&&<div className="commandAiAnswer" data-safe-execution="true"><strong>Low-risk action completed</strong><p>{result.executionReceipt.affectedCount} directly targeted notification(s) were marked read through the authoritative notification service.</p><small>Execution ID {result.executionReceipt.id} · audit evidence recorded · no employment or approval record changed</small></div>}
        {aiRun?.answer?.summary&&<div className="commandAiAnswer"><strong>Evidence-backed answer</strong><p>{aiRun.answer.summary}</p>{Array.isArray(aiRun.answer.citations)&&aiRun.answer.citations.length>0&&<small>{aiRun.answer.citations.length} governed citation(s) · confidence {aiRun.answer.confidence}%</small>}</div>}{aiRun?.status==='blocked'&&<div className="warning">{aiRun.blockedReason||'This AI use is blocked by OPSIQO governance.'}</div>}
        {result.cortexPlan&&<div className="commandExplain"><strong>Cortex plan</strong><div className="cortexMiniSteps">{result.cortexPlan.steps.map(step=><div key={step.id}><span className={`actionLevel level-${step.actionLevel}`}>{step.actionLevel}</span><span><b>{step.agentName}</b> · {step.description}</span></div>)}</div><small>{result.cortexPlan.executionBoundary}</small></div>}
        {result.intelligentForm&&<div className="commandExplain"><strong>{result.intelligentForm.title}</strong><p className="muted">{result.intelligentForm.knownCount} known · {result.intelligentForm.missingRequiredCount} required item(s) still needed</p><div className="smartFormPreview">{result.intelligentForm.fields.map(field=><div className={`smartField ${field.status}`} key={field.id}><span>{field.label}</span><strong>{field.value===undefined||field.value===''?'Needs input':String(field.value)}</strong><small>{field.source||field.explanation}</small></div>)}</div><small>{result.intelligentForm.note}</small></div>}
        {result.explainability&&<details className="commandExplain"><summary>Why is OPSIQO recommending this?</summary><p>{result.explainability.reasoningSummary}</p><div className="row wrap"><span className="badge">confidence {result.explainability.confidence}%</span>{result.explainability.humanDecisionRequired&&<span className="badge">human decision required</span>}</div>{result.explainability.evidence.length>0&&<p className="muted"><b>Evidence:</b> {result.explainability.evidence.join(' · ')}</p>}{result.explainability.missingInformation.length>0&&<p className="muted"><b>Missing:</b> {result.explainability.missingInformation.join(' · ')}</p>}</details>}
        </div>
        <div className="commandResultActions">{result.href&&<Link className="button" href={result.href}>{result.mode==='prepare'?'Continue preparation':result.mode==='execute'?'Review notifications':'Open'}</Link>}{result.mode==='ai'&&!result.analytics&&<Link className="button secondary" href="/ai-copilot">Full evidence view</Link>}{result.analytics&&<Link className="button secondary" href="/intelligence">Explore analytics</Link>}</div>
      </div>}
      <div className="commandBoundary">{shellText('AI does not bypass permissions or authoritative domain services. Consequential employment decisions stay human-controlled.',shellLocale)}</div>
    </div>}
  </section>;
}
