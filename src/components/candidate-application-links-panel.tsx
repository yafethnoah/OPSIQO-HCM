'use client';

import {FormEvent,useEffect,useMemo,useState} from 'react';
import {activeOrgId,apiFetch} from '@/lib/http/client';

type Req={id:string;requisitionNumber:string;title:string;status:string};
type Q={id:string;label:string;type:'yes_no'|'text'|'number'|'select';required:boolean;options:string[]};
type LinkRow={
  id:string;
  requisitionId:string;
  publicToken:string;
  status:'active'|'paused'|'closed';
  coverLetterRequired:boolean;
  allowTalentPoolConsent:boolean;
  screeningQuestions:Q[];
  closingAt?:string;
  applicationsCount?:number;
  reused?:boolean;
};

const q=():Q=>({id:crypto.randomUUID(),label:'',type:'yes_no',required:true,options:[]});
const toLocal=(iso?:string)=>{
  if(!iso)return '';
  const d=new Date(iso);
  if(Number.isNaN(d.getTime()))return '';
  const p=(n:number)=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function CandidateApplicationLinksPanel({requisitions,canManage}:{requisitions:Req[];canManage:boolean}){
  const[links,setLinks]=useState<LinkRow[]>([]);
  const[questions,setQuestions]=useState<Q[]>([]);
  const[selectedReqId,setSelectedReqId]=useState('');
  const[closingAt,setClosingAt]=useState('');
  const[coverRequired,setCoverRequired]=useState(false);
  const[talentPool,setTalentPool]=useState(true);
  const[busy,setBusy]=useState('');
  const[error,setError]=useState('');
  const[actionError,setActionError]=useState('');
  const[notice,setNotice]=useState('');
  const[shareUrl,setShareUrl]=useState('');

  const open=useMemo(()=>requisitions.filter(r=>r.status==='open'),[requisitions]);
  const expired=(l:LinkRow)=>l.status==='active'&&Boolean(l.closingAt&&Date.parse(l.closingAt)<=Date.now());
  const activeForSelected=useMemo(
    ()=>links.filter(l=>l.requisitionId===selectedReqId&&l.status==='active'&&!expired(l)),
    [links,selectedReqId],
  );
  const activeSelected=activeForSelected.length===1?activeForSelected[0]:undefined;

  async function load(){
    try{
      const r=await apiFetch<{data:LinkRow[]}>(`/api/organizations/${activeOrgId()}/recruiting/application-links`);
      setLinks(r.data);
    }catch(e){
      setError(e instanceof Error?e.message:'Unable to load application links.');
    }
  }

  useEffect(()=>{void load()},[]);

  useEffect(()=>{
    setActionError('');
    if(!selectedReqId){
      setQuestions([]);
      setClosingAt('');
      setCoverRequired(false);
      setTalentPool(true);
      return;
    }
    if(activeForSelected.length===1){
      const l=activeForSelected[0];
      setQuestions((l.screeningQuestions||[]).map(x=>({...x,options:[...(x.options||[])]})));
      setClosingAt(toLocal(l.closingAt));
      setCoverRequired(l.coverLetterRequired);
      setTalentPool(l.allowTalentPoolConsent);
    }else if(activeForSelected.length===0){
      setQuestions([]);
      setClosingAt('');
      setCoverRequired(false);
      setTalentPool(true);
    }
  },[selectedReqId,links]);

  async function copyUrl(u:string){
    setShareUrl(u);
    try{
      await navigator.clipboard.writeText(u);
      setNotice('Application link copied to the clipboard.');
    }catch{
      setNotice('Clipboard access was blocked. Use the application link shown below.');
    }
  }

  async function create(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const form=e.currentTarget;
    const f=new FormData(form);
    const requisitionId=String(f.get('requisitionId')||selectedReqId).trim();

    if(!requisitionId){
      setActionError('Select an open requisition first.');
      return;
    }
    if(activeForSelected.length>1){
      setActionError(`This requisition has ${activeForSelected.length} active links. Reconcile duplicates first, then edit the single surviving link.`);
      return;
    }

    setBusy('create');
    setError('');
    setActionError('');
    setNotice('');

    const payload={
      coverLetterRequired:coverRequired,
      allowTalentPoolConsent:talentPool,
      closingAt:closingAt?new Date(closingAt).toISOString():undefined,
      screeningQuestions:questions
        .filter(x=>x.label.trim())
        .map(x=>({...x,label:x.label.trim(),options:x.type==='select'?x.options:[]})),
    };

    try{
      let r:{data:LinkRow};
      let updated=false;

      if(activeSelected){
        updated=true;
        r=await apiFetch<{data:LinkRow}>(
          `/api/organizations/${activeOrgId()}/recruiting/application-links/${activeSelected.id}`,
          {method:'PATCH',body:JSON.stringify({...payload,status:'active',closingAt:payload.closingAt??null})},
        );
      }else{
        r=await apiFetch<{data:LinkRow}>(
          `/api/organizations/${activeOrgId()}/recruiting/application-links`,
          {method:'POST',body:JSON.stringify({requisitionId,...payload})},
        );
      }

      const u=`${location.origin}/apply/${r.data.publicToken}`;
      setShareUrl(u);
      let copied=false;
      try{
        await navigator.clipboard.writeText(u);
        copied=true;
      }catch{}

      setNotice(
        updated
          ? copied
            ? 'Existing active application link updated and copied. The public URL did not change.'
            : 'Existing active application link updated. Clipboard access was blocked; use the link shown below.'
          : r.data.reused
            ? copied
              ? 'Matching active application link reused and copied.'
              : 'Matching active application link reused. Clipboard access was blocked; use the link shown below.'
            : copied
              ? 'Public candidate application link created and copied.'
              : 'Public candidate application link created. Clipboard access was blocked; use the link shown below.',
      );

      if(!updated){
        form.reset();
        setClosingAt('');
        setCoverRequired(false);
        setTalentPool(true);
        setQuestions([]);
      }

      await load();
    }catch(e){
      setActionError(e instanceof Error?e.message:'Unable to save application link.');
    }finally{
      setBusy('');
    }
  }

  async function update(id:string,status:LinkRow['status']){
    setBusy(id);
    setError('');
    setActionError('');
    try{
      await apiFetch(
        `/api/organizations/${activeOrgId()}/recruiting/application-links/${id}`,
        {method:'PATCH',body:JSON.stringify({status})},
      );
      await load();
    }catch(e){
      setError(e instanceof Error?e.message:'Unable to update link.');
    }finally{
      setBusy('');
    }
  }

  async function reconcile(){
    setBusy('reconcile');
    setError('');
    setActionError('');
    try{
      const r=await apiFetch<{data:{duplicateGroups:number;closed:number;expiredClosed?:number}}>(
        `/api/organizations/${activeOrgId()}/recruiting/application-links`,
        {method:'PUT'},
      );
      const expiredCount=r.data.expiredClosed||0;
      setNotice(
        r.data.closed||expiredCount
          ? `Reconciliation closed ${r.data.closed} duplicate link(s) and ${expiredCount} expired active link(s).`
          : 'No duplicate or expired active application links were found.',
      );
      await load();
    }catch(e){
      setActionError(e instanceof Error?e.message:'Unable to reconcile application links.');
    }finally{
      setBusy('');
    }
  }

  const publicUrl=(l:LinkRow)=>`${location.origin}/apply/${l.publicToken}`;

  return <section className="card stack" data-h50-5-application-links="true" data-h50-5g-link-editor="true">
    <div className="toolbar">
      <div>
        <h2 className="sectionTitle">Candidate Application Portal Links</h2>
        <p className="muted">Create one durable public link per requisition. If a valid active link already exists, OPSIQO updates its settings while preserving the same public URL.</p>
      </div>
      <span className="badge">Shareable career link</span>
    </div>

    {error&&<div className="error">{error}</div>}
    {notice&&<div className="success">{notice}</div>}
    {shareUrl&&<div className="notice stack" data-h50-5-share-url="true">
      <strong>Application link</strong>
      <div className="row wrap">
        <input className="input" readOnly value={shareUrl}/>
        <button type="button" className="button secondary" onClick={()=>void copyUrl(shareUrl)}>Copy</button>
        <a className="button secondary" href={shareUrl} target="_blank" rel="noreferrer">Open</a>
      </div>
    </div>}

    {canManage&&<form className="stack" onSubmit={create}>
      <div className="formGrid">
        <label className="field">
          <span>Open requisition</span>
          <select className="input" required name="requisitionId" value={selectedReqId} onChange={e=>setSelectedReqId(e.target.value)}>
            <option value="">Select requisition</option>
            {open.map(r=><option key={r.id} value={r.id}>{r.requisitionNumber} · {r.title}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Closing date/time · optional</span>
          <input className="input" type="datetime-local" name="closingAt" value={closingAt} onChange={e=>setClosingAt(e.target.value)}/>
        </label>
      </div>

      {selectedReqId&&activeForSelected.length===1&&<div className="notice" data-h50-5g-existing-link="true">
        <strong>Existing active link detected.</strong> Saving the settings below will update this link and keep the same public URL. Applications already received remain attached to the requisition.
      </div>}

      {selectedReqId&&activeForSelected.length>1&&<div className="error" role="alert">
        <strong>Multiple active links detected.</strong> Reconcile duplicate links first. OPSIQO will not guess which public URL should survive.
      </div>}

      <label><input type="checkbox" checked={coverRequired} onChange={e=>setCoverRequired(e.target.checked)}/> Require cover letter</label>
      <label><input type="checkbox" checked={talentPool} onChange={e=>setTalentPool(e.target.checked)}/> Offer separate talent-pool consent</label>

      <div className="toolbar">
        <strong>Screening questions</strong>
        <button className="button secondary" type="button" onClick={()=>setQuestions(x=>[...x,q()])}>Add question</button>
      </div>

      {questions.map((x,i)=><div className="card insetCard stack" key={x.id}>
        <div className="formGrid">
          <label className="field">
            <span>Question</span>
            <input className="input" value={x.label} onChange={e=>setQuestions(a=>a.map((v,j)=>j===i?{...v,label:e.target.value}:v))}/>
          </label>
          <label className="field">
            <span>Type</span>
            <select className="input" value={x.type} onChange={e=>setQuestions(a=>a.map((v,j)=>j===i?{...v,type:e.target.value as Q['type']}:v))}>
              <option value="yes_no">Yes / No</option>
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="select">Dropdown</option>
            </select>
          </label>
        </div>
        {x.type==='select'&&<label className="field">
          <span>Options · one per line</span>
          <textarea className="input" rows={3} value={x.options.join('\n')} onChange={e=>setQuestions(a=>a.map((v,j)=>j===i?{...v,options:e.target.value.split('\n').map(s=>s.trim()).filter(Boolean)}:v))}/>
        </label>}
        <div className="row">
          <label><input type="checkbox" checked={x.required} onChange={e=>setQuestions(a=>a.map((v,j)=>j===i?{...v,required:e.target.checked}:v))}/> Required</label>
          <button type="button" className="button secondary" onClick={()=>setQuestions(a=>a.filter((_,j)=>j!==i))}>Remove</button>
        </div>
      </div>)}

      <div className="notice">OPSIQO blocks screening questions that reference protected/sensitive traits. Ask about work authorization, not citizenship or nationality.</div>
      {actionError&&<div className="error" role="alert" data-h50-5g-link-action-error="true">{actionError}</div>}

      <div className="row wrap">
        <button className="button" disabled={busy==='create'||!open.length||activeForSelected.length>1}>
          {busy==='create'?'Saving…':activeSelected?'Update active link & copy':'Create & copy public link'}
        </button>
        <button type="button" className="button secondary" disabled={busy==='reconcile'} onClick={()=>void reconcile()}>
          {busy==='reconcile'?'Reconciling…':'Reconcile duplicate links / expired links'}
        </button>
      </div>
    </form>}

    <div className="tableWrap">
      <table>
        <thead><tr><th>Position</th><th>Status</th><th>Applications</th><th>Cover letter</th><th>Closing</th><th>Share</th></tr></thead>
        <tbody>{links.map(l=>{
          const r=requisitions.find(x=>x.id===l.requisitionId);
          const isExpired=expired(l);
          return <tr key={l.id}>
            <td><strong>{r?.title||l.requisitionId}</strong><div className="muted">{r?.requisitionNumber}</div></td>
            <td><span className="badge">{isExpired?'Expired':l.status}</span></td>
            <td>{l.applicationsCount||0}</td>
            <td>{l.coverLetterRequired?'Required':'Optional'}</td>
            <td>{l.closingAt?new Date(l.closingAt).toLocaleString():'No deadline'}</td>
            <td><div className="stepActions">
              <button type="button" className="button secondary" disabled={isExpired} onClick={()=>void copyUrl(publicUrl(l))}>Copy link</button>
              {!isExpired?<a className="button secondary" href={publicUrl(l)} target="_blank" rel="noreferrer">Preview</a>:<button type="button" className="button secondary" disabled>Preview</button>}
              {l.status==='active'&&canManage&&!isExpired&&<button type="button" className="button secondary" disabled={busy===l.id} onClick={()=>void update(l.id,'paused')}>Pause</button>}
              {l.status==='paused'&&canManage&&<button type="button" className="button secondary" disabled={busy===l.id} onClick={()=>void update(l.id,'active')}>Activate</button>}
              {l.status!=='closed'&&canManage&&<button type="button" className="button secondary" onClick={()=>void update(l.id,'closed')}>Close</button>}
            </div></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  </section>;
}
