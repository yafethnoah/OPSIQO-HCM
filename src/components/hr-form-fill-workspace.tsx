'use client';

import { FormEvent, useMemo, useState } from 'react';
import { activeOrgId, apiFetch } from '@/lib/http/client';
import { OpsiqoSelect } from '@/components/opsiqo-select';

type Field={
  id:string;kind:string;label:string;helpText?:string;placeholder?:string;required?:boolean;defaultValue?:unknown;
  scoring?:{anchors?:Record<string,string>;weight?:number};
  children?:Field[];
};
type Template={title:string;formCode:string;version:string;fields:Field[]};
export type FillInstance={
  id:string;status:string;templateId:string;templateVersion:string;snapshot:Template;
  subject?:Record<string,unknown>;dueAt?:string;packId?:string;
};

export function HrFormFillWorkspace({
  instance,
  onSubmitted,
  onCancel
}:{instance:FillInstance;onSubmitted?:(submission:any)=>void;onCancel?:()=>void}){
  const [answers,setAnswers]=useState<Record<string,unknown>>(()=>defaults(instance.snapshot.fields));
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const fields=useMemo(()=>instance.snapshot.fields.filter(f=>f.id!=='ai_review_guidance'),[instance]);

  async function submit(e:FormEvent){
    e.preventDefault();
    setBusy(true);setError('');
    try{
      const r=await apiFetch<{data:any}>(`/api/organizations/${activeOrgId()}/hr-forms/instances/${instance.id}/submit`,{
        method:'POST',
        body:JSON.stringify({answers}),
      });
      onSubmitted?.(r.data);
    }catch(e){
      setError(e instanceof Error?e.message:'Unable to submit the form.');
    }finally{setBusy(false);}
  }

  return <form className="stack" onSubmit={submit}>
    <section className="card">
      <div className="toolbar">
        <div>
          <span className="eyebrow">Fill in OPSIQO</span>
          <h2 className="sectionTitle">{instance.snapshot.title}</h2>
          <p className="muted">{instance.snapshot.formCode} · v{instance.snapshot.version}{instance.dueAt?` · Due ${new Date(instance.dueAt).toLocaleDateString()}`:''}</p>
        </div>
        {onCancel?<button type="button" className="button secondary" onClick={onCancel}>Back to workspace</button>:null}
      </div>
      <div className="notice" style={{marginTop:12}}>
        Complete the digital form here. Required fields are validated by OPSIQO before submission. Submission uses the existing workflow, audit and notification controls.
      </div>
    </section>

    {error?<div className="error">{error}</div>:null}

    <section className="card stack">
      {fields.map(f=><FillField key={f.id} field={f} answers={answers} setAnswer={(id,value)=>setAnswers(a=>({...a,[id]:value}))}/>)}
    </section>

    <div className="toolbar">
      <span className="muted">Submitting creates the governed form submission record.</span>
      <button className="button" disabled={busy||instance.status!=='open'}>{busy?'Submitting…':'Submit completed form'}</button>
    </div>
  </form>;
}

function defaults(fields:Field[]){
  const out:Record<string,unknown>={};
  const walk=(items:Field[])=>{
    for(const f of items){
      if(f.defaultValue!==undefined)out[f.id]=f.defaultValue;
      if(f.children?.length)walk(f.children);
    }
  };
  walk(fields);return out;
}

function FillField({
  field,answers,setAnswer
}:{field:Field;answers:Record<string,unknown>;setAnswer:(id:string,value:unknown)=>void}){
  if(field.id==='ai_review_guidance')return null;

  if(field.kind==='section')return <fieldset style={{border:'1px solid #dbe3ea',borderRadius:10,padding:18}}>
    <legend style={{fontWeight:800,padding:'0 8px'}}>{field.label}</legend>
    {field.helpText?<p className="muted">{field.helpText}</p>:null}
    <div className="stack">{field.children?.map(c=><FillField key={c.id} field={c} answers={answers} setAnswer={setAnswer}/>)}</div>
  </fieldset>;

  if(field.kind==='instruction'||field.kind==='heading')return <div>
    <strong>{field.label}</strong>{field.helpText?<div className="muted">{field.helpText}</div>:null}
  </div>;

  if(field.kind==='divider')return <hr/>;

  if(field.kind==='acknowledgement'||field.kind==='checkbox')return <label className="checkRow">
    <input type="checkbox" checked={Boolean(answers[field.id])} onChange={e=>setAnswer(field.id,e.target.checked)} required={field.required}/>
    <span>{field.label}{field.required?' *':''}{field.helpText?<span className="muted"> — {field.helpText}</span>:null}</span>
  </label>;

  if(field.kind==='yes_no')return <label className="field"><span>{field.label}{field.required?' *':''}</span>
    <OpsiqoSelect ariaLabel={field.label} value={answers[field.id]===true?'yes':answers[field.id]===false?'no':''} onChange={value=>setAnswer(field.id,value===''?'':value==='yes')} options={[{value:'',label:'Select'},{value:'yes',label:'Yes'},{value:'no',label:'No'}]}/>{field.helpText?<span className="muted">{field.helpText}</span>:null}
  </label>;

  if(field.kind==='scale_1_5'||field.kind==='scale_1_10'||field.kind==='rating') {
    const max=field.kind==='scale_1_10'?10:5;
    return <div className="field"><span>{field.label}{field.required?' *':''}</span>
      <div className="row wrap">{Array.from({length:max},(_,i)=>i+1).map(n=><label key={n} className="checkRow">
        <input type="radio" name={field.id} required={field.required} checked={Number(answers[field.id])===n} onChange={()=>setAnswer(field.id,n)}/>{n}
      </label>)}</div>
      {field.scoring?.anchors?<span className="muted">{Object.entries(field.scoring.anchors).map(([k,v])=>`${k}: ${v}`).join(' · ')}</span>:null}
    </div>;
  }

  if(['repeating_rows','table'].includes(field.kind))return <label className="field"><span>{field.label}{field.required?' *':''}</span>
    <textarea className="input" required={field.required} value={String(answers[field.id]??'')} onChange={e=>setAnswer(field.id,e.target.value)} placeholder="Enter one row/item per line."/>
    {field.helpText?<span className="muted">{field.helpText}</span>:null}
  </label>;

  if(['attachment','image_upload','document_upload'].includes(field.kind))return <label className="field"><span>{field.label}{field.required?' *':''}</span>
    <input className="input" required={field.required} value={String(answers[field.id]??'')} onChange={e=>setAnswer(field.id,e.target.value)} placeholder="Document reference / secure attachment record"/>
    <span className="muted">Record the secure OPSIQO document reference here. Binary upload remains governed by the Documents module.</span>
  </label>;

  if(field.kind==='signature'||field.kind==='initials')return <label className="field"><span>{field.label}{field.required?' *':''}</span>
    <input className="input" required={field.required} value={String(answers[field.id]??'')} onChange={e=>setAnswer(field.id,e.target.value)} placeholder="Type full name / initials"/>
    <span className="muted">Typed acknowledgement is recorded with the authenticated submitter and audit timestamp.</span>
  </label>;

  if(field.kind==='textarea'||field.kind==='rich_text')return <label className="field"><span>{field.label}{field.required?' *':''}</span>
    <textarea className="input" required={field.required} value={String(answers[field.id]??'')} onChange={e=>setAnswer(field.id,e.target.value)} placeholder={field.placeholder||''}/>
    {field.helpText?<span className="muted">{field.helpText}</span>:null}
  </label>;

  const type=field.kind==='number'||field.kind==='currency'||field.kind==='percentage'?'number':
    field.kind==='date'?'date':field.kind==='datetime'?'datetime-local':field.kind==='time'?'time':
    field.kind==='email'?'email':field.kind==='phone'?'tel':field.kind==='url'?'url':'text';

  return <label className="field"><span>{field.label}{field.required?' *':''}</span>
    <input className="input" type={type} required={field.required} value={String(answers[field.id]??'')} onChange={e=>setAnswer(field.id,type==='number'?(e.target.value===''?'':Number(e.target.value)):e.target.value)} placeholder={field.placeholder||''}/>
    {field.helpText?<span className="muted">{field.helpText}</span>:null}
  </label>;
}
