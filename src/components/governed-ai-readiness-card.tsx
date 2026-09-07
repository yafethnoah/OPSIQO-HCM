'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { activeOrgId, apiFetch } from '@/lib/http/client';

type Me = {
  actor: {
    permissions: string[];
    role: string;
  };
};

type Readiness = {
  provider: 'demo' | 'openai' | 'gemini';
  model: string;
  credentialConfigured: boolean;
  activePrompt: boolean;
  activeModel: boolean;
  promptCode?: string | null;
  promptVersion?: number | null;
  modelProfileCode?: string | null;
  modelProfileVersion?: number | null;
  governedConfigRequired?: boolean;
  liveReady: boolean;
  blockers: string[];
};

export function GovernedAiReadinessCard({
  onReady,
}: {
  onReady?: () => void | Promise<void>;
}) {
  const [me,setMe]=useState<Me|null>(null);
  const [readiness,setReadiness]=useState<Readiness|null>(null);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  const load=async()=>{
    setLoading(true);
    setError('');
    try{
      const identity=await apiFetch<Me>('/api/me');
      setMe(identity);
      if(!identity.actor.permissions.includes('ai.use')){
        setReadiness(null);
        return;
      }
      const response=await apiFetch<{data:Readiness}>(
        `/api/organizations/${activeOrgId()}/ai-copilot/readiness`,
      );
      setReadiness(response.data);
    }catch(e){
      setError(e instanceof Error?e.message:'Unable to read governed AI readiness.');
    }finally{
      setLoading(false);
    }
  };

  useEffect(()=>{void load();},[]);

  const canInitialize=Boolean(
    me?.actor.permissions.includes('ai.manage') &&
    me?.actor.permissions.includes('ai.approve') &&
    ['super_admin','org_admin','hr_admin'].includes(me.actor.role)
  );

  const initialize=async()=>{
    setBusy(true);
    setError('');
    try{
      const response=await apiFetch<{data:Readiness}>(
        `/api/organizations/${activeOrgId()}/ai-copilot/readiness`,
        {method:'POST',body:JSON.stringify({action:'initialize'})},
      );
      setReadiness(response.data);
      if(response.data.liveReady) await onReady?.();
    }catch(e){
      setError(e instanceof Error?e.message:'Unable to initialize governed AI.');
    }finally{
      setBusy(false);
    }
  };

  if(!me?.actor.permissions.includes('ai.use') && !loading) return null;

  return <section className="card stack" data-governed-ai-readiness="true">
    <div className="row wrap">
      <div>
        <h2 className="sectionTitle">Governed AI foundation</h2>
        <p className="muted">
          Provider readiness, active governed prompt and active model profile for this organization.
        </p>
      </div>
      <span className="badge">
        {readiness?.liveReady
          ? `Live ${readiness.provider}`
          : loading ? 'Checking…' : 'Setup required'}
      </span>
    </div>

    {error&&<div className="error" role="alert">{error}</div>}

    {loading?<div className="loadingState">
      <div className="loadingDot"/>
      <div><strong>Checking governed AI configuration</strong><small>No credential values are exposed to the browser.</small></div>
    </div>:readiness&&<>
      <div className="metricGrid">
        <div className="metricCard"><span>Provider</span><strong>{readiness.provider}</strong><small>{readiness.model}</small></div>
        <div className="metricCard"><span>Server credential</span><strong>{readiness.credentialConfigured?'READY':'NOT READY'}</strong><small>secret value never displayed</small></div>
        <div className="metricCard"><span>Governed prompt</span><strong>{readiness.activePrompt?'ACTIVE':'MISSING'}</strong><small>{readiness.promptCode||'HR_COPILOT'}{readiness.promptVersion?` v${readiness.promptVersion}`:''}</small></div>
        <div className="metricCard"><span>Model profile</span><strong>{readiness.activeModel?'ACTIVE':'MISSING'}</strong><small>{readiness.modelProfileCode||'HR_COPILOT_MODEL'}{readiness.modelProfileVersion?` v${readiness.modelProfileVersion}`:''}</small></div>
      </div>

      {!readiness.liveReady&&<div className="notice stack">
        <strong>Live governed AI is not ready for this organization.</strong>
        {readiness.blockers.length>0&&<ul>{readiness.blockers.map(item=><li key={item}>{item}</li>)}</ul>}
        {canInitialize&&readiness.provider!=='demo'&&readiness.credentialConfigured&&
          <button type="button" className="button" disabled={busy} onClick={()=>void initialize()}>
            {busy?'Initializing governed AI…':'Initialize governed AI'}
          </button>
        }
        {canInitialize&&(!readiness.credentialConfigured||readiness.provider==='demo')&&
          <small className="muted">
            Configure the approved live provider and server-side credential in the deployment environment before initialization.
          </small>
        }
      </div>}

      {readiness.liveReady&&<div className="notice">
        <strong>Governed AI is live.</strong> Advisory generation can use the active model and prompt. Consequential employment decisions and direct authoritative writes remain blocked.
      </div>}
    </>}

    <div className="row wrap">
      <Link href="/ai-copilot?tab=governance">Open AI Copilot governance</Link>
      <Link href="/ai-governance">Open Cortex agent governance</Link>
    </div>
  </section>;
}