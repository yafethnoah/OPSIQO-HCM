'use client';
import { useState } from 'react';
import type { SeparationTask } from '@/domain/separation';
import { documentHasSubstantiveEvidence } from '@/lib/separation/task-workspace';
import { buildFillablePdf, fillableFieldsFromTemplate } from '@/lib/documents/fillable-pdf';

type Action=(action:string,body?:Record<string,unknown>)=>Promise<void>;
const safeName=(title:string)=>title.replace(/[^a-z0-9]+/gi,'_');
const saveBlob=(name:string,blob:Blob)=>{const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();URL.revokeObjectURL(url);};
const escapeRtf=(value:string)=>value.replace(/\\/g,'\\\\').replace(/{/g,'\\{').replace(/}/g,'\\}').replace(/\n/g,'\\par\n').replace(/[^\x00-\x7F]/g,ch=>`\\u${ch.charCodeAt(0)}?`);

export function SeparationTaskWorkspace({task,onAction,onClose}:{task:SeparationTask;onAction:Action;onClose:()=>void}){
 const requiredSteps=(task.steps||[]).filter(x=>x.required),requiredDocuments=(task.documents||[]).filter(x=>x.required);
 const completedSteps=requiredSteps.filter(x=>x.completed).length,confirmedDocuments=requiredDocuments.filter(x=>x.confirmed&&documentHasSubstantiveEvidence(x.content)).length;
 const ready=requiredSteps.length>0&&completedSteps===requiredSteps.length&&confirmedDocuments===requiredDocuments.length;
 return <section className="separationTaskWorkspace" aria-label={`${task.title} guided workspace`}>
  <div className="runHeader"><div><h3>Guided task workspace</h3><p className="muted">Follow the ordered instructions, complete the evidence record, then confirm. OPSIQO generates editable Word and true fillable PDF working forms from the same governed source.</p></div><button type="button" className="button secondary compact" onClick={onClose}>Close workspace</button></div>
  <div className="notice"><strong>Task completion:</strong> {completedSteps}/{requiredSteps.length} required steps · {confirmedDocuments}/{requiredDocuments.length} required documents confirmed. Human review remains authoritative.</div>
  <div className="taskWorkspaceGrid">
   <div className="taskWorkspacePanel"><h4>Detailed steps to complete</h4><div className="taskStepList">{(task.steps||[]).map((step,index)=><label className={`taskStep ${step.completed?'done':''}`} key={step.id}><input type="checkbox" checked={step.completed} onChange={e=>onAction('set_step',{stepId:step.id,completed:e.target.checked})}/><span><strong>{index+1}. {step.title}</strong><small>{step.instruction}</small><small>{step.required?'Required evidence step':'Optional step'}</small></span></label>)}</div></div>
   <div className="taskWorkspacePanel"><h4>Required forms & working records</h4><div className="taskDocumentList">{(task.documents||[]).map(document=><DocumentEditor key={document.id} document={document} onAction={onAction}/>)}</div></div>
  </div>
  <div className={ready?'success':'notice'}>{ready?'All required steps and documents are confirmed. This task can now be completed.':'Complete every required step and add substantive evidence to at least two labelled fields in each required document.'}</div>
 </section>;
}

function DocumentEditor({document,onAction}:{document:NonNullable<SeparationTask['documents']>[number];onAction:Action}){
 const[content,setContent]=useState(document.content),[saving,setSaving]=useState(false),substantive=documentHasSubstantiveEvidence(content),name=safeName(document.title);
 const fields=fillableFieldsFromTemplate(content);
 const save=async()=>{setSaving(true);try{await onAction('save_document',{documentId:document.id,content});}finally{setSaving(false);}};
 const confirm=async()=>{setSaving(true);try{await onAction('save_document',{documentId:document.id,content});await onAction('confirm_document',{documentId:document.id});}finally{setSaving(false);}};
 const word=()=>saveBlob(`${name}.rtf`,new Blob([`{\\rtf1\\ansi\\deff0 ${escapeRtf(content)}}`],{type:'application/rtf'}));
 const pdf=()=>{const generated=buildFillablePdf({title:document.title,subtitle:'OPSIQO offboarding form · editable fields · human review required',content});const arrayBuffer=generated.buffer.slice(generated.byteOffset,generated.byteOffset+generated.byteLength) as ArrayBuffer;saveBlob(`${name}.pdf`,new Blob([arrayBuffer],{type:'application/pdf'}));};
 const printPdf=()=>{const popup=window.open('','_blank','noopener,noreferrer');if(!popup)return;const safeContent=content.replace(/[&<>]/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[x]!));popup.document.write(`<html><head><title>${name}</title><style>body{font:12pt Arial;margin:36px;white-space:pre-wrap;line-height:1.5}</style></head><body>${safeContent}</body></html>`);popup.document.close();popup.focus();popup.print();};
 return <article className="taskDocument">
  <div className="runHeader"><div><strong>{document.title}</strong><small>{document.description}</small><small>{fields.length} fillable PDF field(s) detected from labelled form content.</small></div><span className="badge">{document.confirmed?'confirmed':'draft'}</span></div>
  <textarea className="input taskDocumentEditor" value={content} onChange={e=>setContent(e.target.value)}/>
  {!substantive&&<small className="muted">Enter substantive information in at least two labelled fields before confirmation. Blank fields remain editable in the generated PDF.</small>}
  <div className="stepActions">
   <button type="button" className="button secondary compact" onClick={word}>Download Word</button>
   <button type="button" className="button secondary compact" disabled={!fields.length} onClick={pdf}>Download fillable PDF</button>
   <button type="button" className="button secondary compact" onClick={printPdf}>Print / Save PDF</button>
   <button type="button" className="button secondary compact" disabled={saving} onClick={save}>{saving?'Saving…':'Save draft'}</button>
   <button type="button" className="button compact" disabled={saving||document.confirmed||!substantive} onClick={confirm}>{document.confirmed?'Confirmed':'Confirm document'}</button>
  </div>
 </article>;
}
