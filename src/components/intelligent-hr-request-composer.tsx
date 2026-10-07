'use client';

import { useEffect,useState } from 'react';
import type { ServiceCatalogItem } from '@/domain/experience';
import { OpsiqoSelect } from '@/components/opsiqo-select';
import { activeOrgId,apiFetch } from '@/lib/http/client';

type Assist={
  sessionId:string;
  recommendedCatalogItem:{id:string;code:string;name:string;category:string};
  suggestions:Array<{id:string;title:string;summary:string;body:string;category:string;relevance:number}>;
  triage:{
    suggestedPriority:'low'|'normal'|'high'|'urgent';
    suggestedConfidentiality:'standard'|'restricted';
    routingRole:string;
    confidence:number;
    reasons:string[];
    directHumanReviewRecommended:boolean;
  };
  promptWrittenBy:'OPSIQO';
  note:string;
};

export function IntelligentHrRequestComposer({catalog,onSubmitted}:{catalog:ServiceCatalogItem[];onSubmitted?:()=>void|Promise<void>}){
  const[catalogId,setCatalogId]=useState('');
  const[subject,setSubject]=useState('');
  const[description,setDescription]=useState('');
  const[assist,setAssist]=useState<Assist|null>(null);
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState('');
  const[notice,setNotice]=useState('');

  useEffect(()=>{
    if(catalogId&&!catalog.some(x=>x.id===catalogId))setCatalogId('');
  },[catalog,catalogId]);

  async function analyze(){
    setBusy(true);setError('');setNotice('');
    try{
      const response=await apiFetch<{data:Assist}>(`/api/organizations/${activeOrgId()}/experience/self-service`,{
        method:'POST',
        body:JSON.stringify({catalogItemId:catalogId||undefined,subject,description}),
      });
      setAssist(response.data);
      if(!catalogId&&response.data.recommendedCatalogItem?.id)setCatalogId(response.data.recommendedCatalogItem.id);
    }catch(e){setError(e instanceof Error?e.message:'Unable to prepare intelligent self-service guidance.');}
    finally{setBusy(false);}
  }

  async function submit(){
    setBusy(true);setError('');setNotice('');
    try{
      if(!catalogId)throw new Error('Choose an HR service before submitting the request.');
      const response=await apiFetch<{data:{referenceNumber:string}}>(`/api/organizations/${activeOrgId()}/service/tickets`,{
        method:'POST',
        body:JSON.stringify({
          catalogItemId:catalogId,
          subject,
          description,
          confidentiality:assist?.triage.suggestedConfidentiality||'standard',
          selfServiceSessionId:assist?.sessionId,
        }),
      });
      setNotice(`${response.data.referenceNumber} was created. OPSIQO applied governed routing, SLA and triage controls.`);
      setSubject('');setDescription('');setAssist(null);
      await onSubmitted?.();
    }catch(e){setError(e instanceof Error?e.message:'HR request could not be submitted.');}
    finally{setBusy(false);}
  }

  async function resolveWithoutTicket(){
    if(!assist)return;
    setBusy(true);setError('');setNotice('');
    try{
      await apiFetch(`/api/organizations/${activeOrgId()}/experience/self-service`,{
        method:'PATCH',
        body:JSON.stringify({sessionId:assist.sessionId,action:'resolved'}),
      });
      setNotice('Marked resolved through HR knowledge. No HR service ticket was created.');
      setSubject('');setDescription('');setAssist(null);
      await onSubmitted?.();
    }catch(e){setError(e instanceof Error?e.message:'Unable to record the self-service resolution.');}
    finally{setBusy(false);}
  }

  const ready=subject.trim().length>=4&&description.trim().length>=10;
  return <section className="card stack">
    <div>
      <span className="eyebrow">Intelligent employee self-service</span>
      <h2 className="sectionTitle">Get an answer first — open a request only when needed</h2>
      <p className="muted">OPSIQO searches published HR knowledge and prepares governed triage automatically. No AI prompt is required from the employee.</p>
    </div>
    {error&&<div className="error" role="alert">{error}</div>}
    {notice&&<div className="success" role="status">{notice}</div>}

    <label className="field"><span>HR service</span>
      <OpsiqoSelect
        ariaLabel="HR service"
        value={catalogId}
        onChange={value=>{setCatalogId(value);setAssist(null)}}
        options={[{value:'',label:'Choose a service'},...catalog.map(c=>({value:c.id,label:c.name}))]}
      />
    </label>
    <label className="field"><span>What do you need?</span><input className="input" value={subject} onChange={e=>{setSubject(e.target.value);setAssist(null)}} placeholder="Short subject"/></label>
    <label className="field"><span>Describe the request</span><textarea className="input textArea" value={description} onChange={e=>{setDescription(e.target.value);setAssist(null)}} placeholder="Add the details HR would need if self-service does not resolve it."/></label>

    {!assist?<div className="inlineControls">
      <button className="button" disabled={busy||!ready} onClick={analyze}>{busy?'Preparing guidance…':'Find answer & prepare request'}</button>
      <button className="button secondary" disabled={busy||!ready||!catalogId} onClick={submit}>Submit directly to HR</button>
    </div>:<>
      <div className="notice">
        <strong>OPSIQO triage:</strong> {assist.triage.suggestedPriority} priority · {assist.triage.suggestedConfidentiality} handling · confidence {assist.triage.confidence}%.
        {assist.triage.directHumanReviewRecommended?' Direct human review is recommended.':''}
      </div>
      {assist.suggestions.length?<div className="stack">
        <h3>Suggested HR knowledge</h3>
        <div className="knowledgeGrid">{assist.suggestions.map(article=><article className="card" key={article.id}>
          <div className="rowBetween"><span className="badge">{article.category}</span><span className="muted">{article.relevance}% match</span></div>
          <h3>{article.title}</h3><p>{article.summary}</p>
          <details><summary>Read guidance</summary><div className="articleBody">{article.body}</div></details>
        </article>)}</div>
      </div>:<div className="notice">No sufficiently relevant published HR knowledge article was found. The request can go directly to HR.</div>}
      <div className="inlineControls">
        {assist.suggestions.length?<button className="button secondary" disabled={busy} onClick={resolveWithoutTicket}>This answered my question</button>:null}
        <button className="button" disabled={busy||!catalogId} onClick={submit}>Still need HR — submit request</button>
        <button className="button secondary" disabled={busy} onClick={()=>setAssist(null)}>Edit request</button>
      </div>
      <p className="muted">Knowledge and triage are advisory. Individualized HR decisions remain with authorized people and governed workflows.</p>
    </>}
    {!catalog.length&&<div className="notice">No enabled HR service catalog is available yet. HR can publish the standard catalog from Experience → Admin.</div>}
  </section>;
}
