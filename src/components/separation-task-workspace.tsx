'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SeparationTask } from '@/domain/separation';
import type { PlatformSettings } from '@/domain/platform-settings';
import { documentHasSubstantiveEvidence, documentHasCompleteFields } from '@/lib/separation/task-workspace';
import { buildFillablePdf, fillableFieldsFromTemplate } from '@/lib/documents/fillable-pdf';
import {
  brandFromPlatformSettings,
  buildBrandedDocumentHtml,
  buildWordCompatibleDocument,
  parseProfessionalDocument,
  professionalDocumentMissingFields,
  updateProfessionalDocumentField,
  type DocumentBrandProfile,
} from '@/lib/documents/professional-document';
import { activeOrgId, apiFetch } from '@/lib/http/client';

type Action=(action:string,body?:Record<string,unknown>)=>Promise<void>;
const safeName=(title:string)=>title.replace(/[^a-z0-9]+/gi,'_');

const saveBlob=(name:string,blob:Blob)=>{
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;
  link.download=name;
  link.click();
  URL.revokeObjectURL(url);
};

type LaunchpadPreview={organization:{name:string}};

export function SeparationTaskWorkspace({task,onAction,onClose}:{task:SeparationTask;onAction:Action;onClose:()=>void}){
 const requiredSteps=(task.steps||[]).filter(x=>x.required),requiredDocuments=(task.documents||[]).filter(x=>x.required);
 const completedSteps=requiredSteps.filter(x=>x.completed).length,confirmedDocuments=requiredDocuments.filter(x=>x.confirmed&&documentHasCompleteFields(x.content)).length;
 const ready=requiredSteps.length>0&&completedSteps===requiredSteps.length&&confirmedDocuments===requiredDocuments.length;
 const[brand,setBrand]=useState<DocumentBrandProfile>(()=>brandFromPlatformSettings(null,'Organization'));
 const[brandReady,setBrandReady]=useState(false);

 useEffect(()=>{
   let alive=true;
   void Promise.allSettled([
     apiFetch<{data:PlatformSettings}>(`/api/organizations/${activeOrgId()}/platform-settings`),
     apiFetch<{data:LaunchpadPreview}>(`/api/organizations/${activeOrgId()}/opsiqo-one/organization-launchpad`),
   ]).then(results=>{
     if(!alive)return;
     const settings=results[0].status==='fulfilled'?results[0].value.data:null;
     const orgName=results[1].status==='fulfilled'?results[1].value.data.organization.name:'Organization';
     setBrand(brandFromPlatformSettings(settings as unknown as Record<string,unknown>|null,orgName));
     setBrandReady(true);
   });
   return()=>{alive=false};
 },[]);

 return <section className="separationTaskWorkspace" aria-label={`${task.title} guided workspace`}>
  <div className="runHeader"><div><h3>Guided task workspace</h3><p className="muted">Complete the ordered work, then prepare professional branded documents. Known case information is prefilled; every unresolved item appears as a labelled HR question beside the field that must be completed.</p></div><button type="button" className="button secondary compact" onClick={onClose}>Close workspace</button></div>
  <div className="notice"><strong>Task completion:</strong> {completedSteps}/{requiredSteps.length} required steps · {confirmedDocuments}/{requiredDocuments.length} required documents confirmed. Human review remains authoritative.</div>
  <div className="taskWorkspaceGrid">
   <div className="taskWorkspacePanel"><h4>Detailed steps to complete</h4><div className="taskStepList">{(task.steps||[]).map((step,index)=><label className={`taskStep ${step.completed?'done':''}`} key={step.id}><input type="checkbox" checked={step.completed} onChange={e=>onAction('set_step',{stepId:step.id,completed:e.target.checked})}/><span><strong>{index+1}. {step.title}</strong><small>{step.instruction}</small><small>{step.required?'Required evidence step':'Optional step'}</small></span></label>)}</div></div>
   <div className="taskWorkspacePanel">
    <div className="row wrap" style={{justifyContent:'space-between',alignItems:'center'}}>
      <div><h4 style={{marginBottom:4}}>Professional documents & records</h4><small className="muted">Company letterhead, structured sections, complete HR fields, editable PDF, Word-compatible export and print-ready output.</small></div>
      <span className="badge">{brandReady?brand.companyName:'Loading company brand…'}</span>
    </div>
    <div className="taskDocumentList">{(task.documents||[]).map(document=><DocumentEditor key={document.id} document={document} onAction={onAction} brand={brand}/>)}</div>
   </div>
  </div>
  <div className={ready?'success':'notice'}>{ready?'All required steps and professionally completed documents are confirmed. This task can now be completed.':'Complete every required step and resolve every required document field. Use N/A where a field is genuinely not applicable; do not leave unresolved blanks.'}</div>
 </section>;
}

function DocumentEditor({document,onAction,brand}:{document:NonNullable<SeparationTask['documents']>[number];onAction:Action;brand:DocumentBrandProfile}){
 const[content,setContent]=useState(document.content),[saving,setSaving]=useState(false),[showSource,setShowSource]=useState(false);
 const parsed=useMemo(()=>parseProfessionalDocument(content),[content]);
 const missing=useMemo(()=>professionalDocumentMissingFields(content),[content]);
 const substantive=documentHasSubstantiveEvidence(content);
 const complete=documentHasCompleteFields(content)&&missing.length===0;
 const name=safeName(document.title);
 const fields=fillableFieldsFromTemplate(content);
 const completion=fields.length?Math.round(((fields.length-missing.length)/fields.length)*100):0;

 const save=async()=>{
   setSaving(true);
   try{await onAction('save_document',{documentId:document.id,content});}
   finally{setSaving(false);}
 };
 const confirm=async()=>{
   setSaving(true);
   try{
     await onAction('save_document',{documentId:document.id,content});
     await onAction('confirm_document',{documentId:document.id});
   }finally{setSaving(false);}
 };
 const word=()=>{
   const html=buildWordCompatibleDocument({title:document.title,content,brand,documentReference:document.id});
   saveBlob(`${name}.doc`,new Blob([html],{type:'application/msword;charset=utf-8'}));
 };
 const pdf=()=>{
   const generated=buildFillablePdf({
     title:document.title,
     subtitle:`${brand.companyName} - editable HR working document - human review required`,
     content,
     brand,
     documentReference:document.id,
   });
   const arrayBuffer=generated.buffer.slice(generated.byteOffset,generated.byteOffset+generated.byteLength) as ArrayBuffer;
   saveBlob(`${name}.pdf`,new Blob([arrayBuffer],{type:'application/pdf'}));
 };
 const printPdf=()=>{
   const popup=window.open('','_blank','noopener,noreferrer');
   if(!popup)return;
   popup.document.write(buildBrandedDocumentHtml({title:document.title,content,brand,documentReference:document.id}));
   popup.document.close();
   popup.focus();
   window.setTimeout(()=>popup.print(),250);
 };

 return <article className="taskDocument" style={{padding:16}}>
  <div className="runHeader">
    <div>
      <strong>{document.title}</strong>
      <small>{document.description}</small>
      <small>{fields.length} professional field(s) · {missing.length} missing · {completion}% complete.</small>
    </div>
    <span className="badge">{document.confirmed?'confirmed':missing.length?`${missing.length} missing`:'ready for review'}</span>
  </div>

  <div style={{margin:'10px 0'}}>
    <div className="row wrap" style={{justifyContent:'space-between'}}>
      <strong>Document completion</strong>
      <span className="muted">{completion}%</span>
    </div>
    <div role="progressbar" aria-label={`${document.title} completion`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion} style={{height:8,borderRadius:999,overflow:'hidden',background:'var(--border, rgba(127,127,127,.25))',marginTop:6}}>
      <div style={{width:`${completion}%`,height:'100%',background:brand.accentColor}}/>
    </div>
  </div>

  {missing.length>0&&<div className="notice"><strong>HR input required:</strong> Complete the highlighted fields below. If an item does not apply, enter <strong>N/A</strong> so the record contains an explicit human determination rather than a blank.</div>}

  <div className="stack" style={{marginTop:12}}>
    {parsed.blocks.map(block=>{
      if(block.kind==='title'||block.kind==='blank')return null;
      if(block.kind==='section')return <h4 key={block.lineIndex} style={{margin:'14px 0 4px',color:brand.primaryColor,borderBottom:`2px solid ${brand.accentColor}`,paddingBottom:5}}>{block.text}</h4>;
      if(block.kind==='paragraph')return <p key={block.lineIndex} className="muted" style={{margin:'4px 0 10px'}}>{block.text}</p>;
      const field=block.field!;
      const missingField=!field.value.trim();
      return <div key={block.lineIndex} style={{display:'grid',gridTemplateColumns:'minmax(180px, 38%) minmax(220px, 62%)',gap:12,alignItems:'start',padding:'9px 0',borderBottom:'1px solid var(--border, rgba(127,127,127,.18))'}}>
        <label htmlFor={`${document.id}-${block.lineIndex}`} style={{fontWeight:700,paddingTop:9}}>
          {field.label}
          <span style={{display:'block',fontWeight:400,fontSize:12,marginTop:3}} className={missingField?'warningText':'muted'}>{missingField?'Required HR input':'Provided / prefilled'}</span>
        </label>
        {field.multiline?
          <textarea id={`${document.id}-${block.lineIndex}`} className="input" rows={3} value={field.value} placeholder="HR enters the verified information here" onChange={e=>setContent(updateProfessionalDocumentField(content,field.lineIndex,e.target.value))} style={missingField?{borderColor:'#c2410c'}:undefined}/>:
          <input id={`${document.id}-${block.lineIndex}`} className="input" value={field.value} placeholder="HR enters the verified information here" onChange={e=>setContent(updateProfessionalDocumentField(content,field.lineIndex,e.target.value))} style={missingField?{borderColor:'#c2410c',minHeight:44}:{minHeight:44}}/>
        }
      </div>;
    })}
  </div>

  <div className="row wrap" style={{marginTop:12}}>
    <button type="button" className="button secondary compact" onClick={()=>setShowSource(value=>!value)}>{showSource?'Hide source template':'Advanced: view source template'}</button>
    <span className="muted">The structured form above is authoritative for editing; source view is provided for troubleshooting only.</span>
  </div>
  {showSource&&<textarea className="input taskDocumentEditor" readOnly value={content} aria-label={`${document.title} source template`}/>}

  {!substantive&&<small className="muted">This document does not yet contain enough substantive evidence for review.</small>}
  {!complete&&substantive&&<small className="muted">Substantive information exists, but all labelled fields must still be resolved before confirmation.</small>}

  <div className="stepActions">
   <button type="button" className="button secondary compact" aria-label="Download Word" onClick={word}>Download branded Word</button>
   <button type="button" className="button secondary compact" aria-label="Download fillable PDF" disabled={!fields.length} onClick={pdf}>Download branded fillable PDF</button>
   <button type="button" className="button secondary compact" aria-label="Print / Save PDF" onClick={printPdf}>Print / Save professional PDF</button>
   <button type="button" className="button secondary compact" disabled={saving} onClick={save}>{saving?'Saving…':'Save draft'}</button>
   <button type="button" className="button compact" disabled={saving||document.confirmed||!complete} onClick={confirm}>{document.confirmed?'Confirmed':'Confirm completed document'}</button>
  </div>
 </article>;
}
