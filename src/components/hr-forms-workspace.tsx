'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { activeOrgId, apiDownload, apiFetch } from '@/lib/http/client';
import { HrFormDocumentPreview } from '@/components/hr-form-document-preview';

type Field={id:string;kind:string;label:string;required?:boolean;helpText?:string;defaultValue?:unknown;scoring?:{enabled:boolean;weight?:number;anchors?:Record<string,string>};children?:Field[]};
type Template={id:string;formCode:string;title:string;description?:string;category:string;subcategory?:string;status:string;version:string;sensitivity:string;workflowId?:string;aiGenerated:boolean;fields:Field[];updatedAt:string};
type Submission={id:string;templateId:string;templateVersion:string;submittedBy:string;submittedAt:string;status:string;workflowRunId?:string;score?:{weightedTotal?:number}};
type Dashboard={metrics:{templates:number;published:number;drafts:number;openRequests:number;submissions:number;underReview:number;aiGenerated:number};categories:Array<{category:string;count:number}>};
type Option={id:string;kind:string;label:string;subtitle?:string};
type Intent={id:string;label:string;description:string;targetKind:'requisition'|'position'|'worker';pack:boolean};
type StudioOptions={organization:{id:string;name:string};intents:Intent[];requisitions:Option[];positions:Option[];workers:Option[];workflows:Option[]};
type Tab='studio'|'library'|'preview'|'advanced'|'submissions'|'analytics'|'governance';

const friendlyKinds:[string,string][]=[['text','Short answer'],['textarea','Long answer'],['number','Number'],['date','Date'],['email','Email'],['phone','Phone'],['dropdown','Dropdown'],['multi_select','Multiple choice'],['yes_no','Yes / No'],['scale_1_5','1–5 rating'],['signature','Signature'],['attachment','Attachment'],['acknowledgement','Acknowledgement'],['section','Section'],['instruction','Instruction']];

export function HrFormsWorkspace(){
  const [tab,setTab]=useState<Tab>('studio'),[templates,setTemplates]=useState<Template[]>([]),[submissions,setSubmissions]=useState<Submission[]>([]),[dashboard,setDashboard]=useState<Dashboard|null>(null),[options,setOptions]=useState<StudioOptions|null>(null);
  const [selectedId,setSelectedId]=useState(''),[intent,setIntent]=useState('recruitment'),[output,setOutput]=useState<'single'|'pack'>('single'),[targetId,setTargetId]=useState(''),[notes,setNotes]=useState('');
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[studioResult,setStudioResult]=useState<any>(null);
  const selected=useMemo(()=>templates.find(x=>x.id===selectedId)||null,[templates,selectedId]);
  const org=()=>activeOrgId();
  const chosenIntent=options?.intents.find(x=>x.id===intent);
  const targetOptions=chosenIntent?.targetKind==='requisition'?options?.requisitions:chosenIntent?.targetKind==='worker'?options?.workers:options?.positions;

  const load=async()=>{try{const [t,d,s,o]=await Promise.all([
    apiFetch<{data:Template[]}>(`/api/organizations/${org()}/hr-forms/templates`),
    apiFetch<{data:Dashboard}>(`/api/organizations/${org()}/hr-forms/dashboard`),
    apiFetch<{data:Submission[]}>(`/api/organizations/${org()}/hr-forms/submissions`).catch(()=>({data:[]})),
    apiFetch<{data:StudioOptions}>(`/api/organizations/${org()}/hr-forms/studio/options`)
  ]);setTemplates(t.data);setDashboard(d.data);setSubmissions(s.data);setOptions(o.data);setSelectedId(x=>x&&t.data.some(y=>y.id===x)?x:(t.data[0]?.id||''));setError('');}catch(e){setError(e instanceof Error?e.message:'Unable to load HR Forms.');}};
  useEffect(()=>{void load();},[]);

  function chooseIntent(id:string){setIntent(id);setTargetId('');const i=options?.intents.find(x=>x.id===id);setOutput(i?.pack?'pack':'single');}

  async function generate(e:FormEvent){e.preventDefault();setBusy(true);setError('');setNotice('');try{
    const i=options?.intents.find(x=>x.id===intent);
    const r=await apiFetch<{data:any}>(`/api/organizations/${org()}/hr-forms/studio/generate`,{method:'POST',body:JSON.stringify({intent,output,targetKind:i?.targetKind,targetId:targetId||undefined,notes:notes||undefined}),reconcileOnServerError:false});
    setStudioResult(r.data);setNotice(`${r.data.templates.length} professional ${r.data.templates.length===1?'form':'forms'} created. OPSIQO wrote the AI prompt automatically and used governed organization context. Review before publishing.`);
    await load();setSelectedId(r.data.templates[0]?.id||'');setTab('preview');
  }catch(e){setError(e instanceof Error?e.message:'Intelligent form generation failed.');}finally{setBusy(false);}}

  async function action(action:string,patch?:unknown){if(!selected)return;setBusy(true);setError('');try{const r=await apiFetch<{data:Template}>(`/api/organizations/${org()}/hr-forms/templates/${selected.id}`,{method:'PATCH',body:JSON.stringify({action,patch})});setNotice(`Form ${action.replaceAll('_',' ')} completed.`);await load();setSelectedId(r.data.id);}catch(e){setError(e instanceof Error?e.message:'Unable to update form.');}finally{setBusy(false);}}
  async function addField(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!selected)return;const form=e.currentTarget,f=new FormData(form),label=String(f.get('label')||'').trim(),kind=String(f.get('kind')||'text'),id=`f_${Date.now().toString(36)}`;const field:Field={id,kind,label,required:f.get('required')==='on',helpText:String(f.get('helpText')||'').trim()||undefined};if(kind==='scale_1_5')field.scoring={enabled:true,weight:Number(f.get('weight')||0)||undefined};await action('save',{fields:[...selected.fields,field]});form.reset();}
  async function removeField(id:string){if(!selected)return;await action('save',{fields:selected.fields.filter(x=>x.id!==id)});}
  async function downloadTemplate(id:string,format:'pdf'|'docx'){try{const r=await apiDownload(`/api/organizations/${org()}/hr-forms/templates/${id}/export?format=${format}`);const url=URL.createObjectURL(r.blob),a=document.createElement('a');a.href=url;a.download=r.fileName||`HR_Form.${format}`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);}catch(e){setError(e instanceof Error?e.message:'Download failed.');}}
  async function downloadSubmission(id:string,format:'pdf'|'docx'){try{const r=await apiDownload(`/api/organizations/${org()}/hr-forms/submissions/${id}/export?format=${format}`);const url=URL.createObjectURL(r.blob),a=document.createElement('a');a.href=url;a.download=r.fileName||`HR_Form.${format}`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);}catch(e){setError(e instanceof Error?e.message:'Download failed.');}}

  return <div className="stack">
    <div className="toolbar"><div className="row wrap">{([
      ['studio','Create Form'],['library','Form Library'],['preview','Preview'],['advanced','Advanced Editor'],['submissions','Submissions'],['analytics','Analytics'],['governance','Governance']
    ] as [Tab,string][]).map(([id,label])=><button key={id} className={`button ${tab===id?'':'secondary'}`} onClick={()=>setTab(id)}>{label}</button>)}</div><a className="button secondary" href="/workflows">Workflow Designer</a></div>
    {error?<div className="error">{error}</div>:null}{notice?<div className="success">{notice}</div>:null}

    {tab==='studio'?<div className="stack">
      <section className="card stack" style={{padding:'28px'}}>
        <div><span className="eyebrow">Intelligent Form Studio</span><h2 className="sectionTitle" style={{fontSize:26}}>What do you need OPSIQO to create?</h2><p className="muted">Choose the HR process. OPSIQO finds relevant organization context, writes the AI prompt itself, builds the complete professional form, and prepares digital, PDF and DOCX versions.</p></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:12}}>
          {options?.intents.map(i=><button type="button" key={i.id} onClick={()=>chooseIntent(i.id)} style={{textAlign:'left',border:intent===i.id?'2px solid #1ABCBC':'1px solid #d7e0e8',borderRadius:12,padding:16,background:intent===i.id?'rgba(26,188,188,.08)':'var(--card-bg,#fff)',cursor:'pointer'}}><strong style={{display:'block',fontSize:16}}>{i.label}</strong><span className="muted" style={{fontSize:12}}>{i.description}</span></button>)}
        </div>
      </section>

      <section className="grid2">
        <form className="card stack" onSubmit={generate}>
          <div><span className="eyebrow">Step 2</span><h2 className="sectionTitle">OPSIQO prepares everything</h2></div>
          {chosenIntent?.pack?<label className="field"><span>What should be created?</span><select className="input" value={output} onChange={e=>setOutput(e.target.value as any)}><option value="pack">Complete form pack — recommended</option><option value="single">Single primary form</option></select></label>:<div className="notice"><strong>Output:</strong> Complete professional form</div>}
          <label className="field"><span>{chosenIntent?.targetKind==='requisition'?'Use this vacancy / requisition':chosenIntent?.targetKind==='worker'?'Pre-fill for this employee (optional)':'Use this position (optional)'}</span><select className="input" value={targetId} onChange={e=>setTargetId(e.target.value)}><option value="">Reusable template — no specific record</option>{targetOptions?.map(o=><option key={o.id} value={o.id}>{o.label}{o.subtitle?` — ${o.subtitle}`:''}</option>)}</select></label>
          <label className="field"><span>Anything else OPSIQO should know? <span className="muted">(optional)</span></span><textarea className="input" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Example: Include a second manager approval or add a bilingual employee acknowledgement."/></label>
          <div className="notice"><strong>No prompt needed.</strong> OPSIQO writes the governed prompt automatically from your selection and the organization’s approved records. You will never need to type a database record ID.</div>
          <button className="button" disabled={busy}>{busy?'Building professional forms…':output==='pack'?'Generate complete form pack':'Generate complete form'}</button>
        </form>

        <section className="card stack">
          <span className="eyebrow">What OPSIQO does automatically</span>
          <h2 className="sectionTitle">From HR need to usable document</h2>
          <div className="stack">
            {['Understands the selected HR process','Finds relevant organization, vacancy, position, employee, policy and workflow context','Writes the AI prompt internally','Builds professional sections, tables, checkboxes, scoring and signatures','Creates a governed draft with version control','Prepares a live document preview','Makes PDF + DOCX + digital OPSIQO versions available','Keeps approval and consequential decisions with authorized people'].map((x,i)=><div key={x} style={{display:'flex',gap:12,alignItems:'flex-start'}}><span className="badge">{i+1}</span><span>{x}</span></div>)}
          </div>
        </section>
      </section>

      {studioResult?<section className="card stack"><div className="toolbar"><div><span className="eyebrow">Generation complete</span><h2 className="sectionTitle">{studioResult.templates.length} professional form{studioResult.templates.length===1?'':'s'} ready for review</h2></div><span className="badge">Prompt written by OPSIQO</span></div>
        <div className="row wrap">{studioResult.templates.map((t:Template)=><button className="button secondary" key={t.id} onClick={()=>{setSelectedId(t.id);setTab('preview')}}>{t.title}</button>)}</div>
        {studioResult.contextUsed?.length?<div><strong>Organization context used</strong><div className="row wrap" style={{marginTop:8}}>{studioResult.contextUsed.map((x:any)=><span key={x.id} className="badge">{x.title}</span>)}</div></div>:null}
        {studioResult.missingOrganizationalSources?.length?<div className="notice"><strong>Review before publication:</strong> {studioResult.missingOrganizationalSources.join(' ')}</div>:null}
      </section>:null}
    </div>:null}

    {tab==='library'?<section className="card tableWrap"><div className="toolbar"><div><span className="eyebrow">Controlled documents</span><h2 className="sectionTitle">Form Library</h2></div><button className="button" onClick={()=>setTab('studio')}>Create HR Form</button></div><table><thead><tr><th>Form</th><th>Category</th><th>Version</th><th>Status</th><th>Outputs</th></tr></thead><tbody>{templates.map(t=><tr key={t.id}><td><button style={{background:'none',border:0,padding:0,textAlign:'left',cursor:'pointer'}} onClick={()=>{setSelectedId(t.id);setTab('preview')}}><strong>{t.title}</strong><div className="muted">{t.formCode}{t.aiGenerated?' · OPSIQO-assisted':''}</div></button></td><td>{t.category}</td><td>v{t.version}</td><td><span className="badge">{t.status.replaceAll('_',' ')}</span></td><td><div className="row wrap"><button className="button secondary compact" onClick={()=>downloadTemplate(t.id,'pdf')}>PDF</button><button className="button secondary compact" onClick={()=>downloadTemplate(t.id,'docx')}>DOCX</button></div></td></tr>)}{!templates.length?<tr><td colSpan={5} className="muted">No forms yet. Create one with Intelligent Form Studio.</td></tr>:null}</tbody></table></section>:null}

    {tab==='preview'?<div className="stack">{selected?<><section className="card"><div className="toolbar"><div><span className="eyebrow">Professional document preview</span><h2 className="sectionTitle">{selected.title}</h2></div><div className="row wrap"><button className="button secondary" onClick={()=>downloadTemplate(selected.id,'pdf')}>Download fillable PDF</button><button className="button secondary" onClick={()=>downloadTemplate(selected.id,'docx')}>Download editable DOCX</button><button className="button secondary" onClick={()=>setTab('advanced')}>Advanced Editor</button></div></div>
        <div className="row wrap" style={{marginTop:14}}>{!['published','retired','superseded'].includes(selected.status)?<button className="button secondary" onClick={()=>action('submit_review')}>Submit for review</button>:null}{['draft','under_review'].includes(selected.status)?<button className="button secondary" onClick={()=>action('approve')}>Approve</button>:null}{selected.status==='approved'?<button className="button" onClick={()=>action('publish')}>Publish</button>:null}{selected.status==='published'?<button className="button secondary" onClick={()=>action('new_version')}>Create new version</button>:null}</div></section>
        <HrFormDocumentPreview template={selected} organization={options?.organization.name||'Organization'}/></>:<div className="card muted">Select a form from the library.</div>}</div>:null}

    {tab==='advanced'?<>{selected?<div className="grid2"><section className="card stack"><div><span className="eyebrow">Advanced Editor</span><h2 className="sectionTitle">{selected.title}</h2><p className="muted">Most users should use Intelligent Form Studio. This editor is for exceptional field-level changes.</p></div><div className="notice">Published forms are immutable. Create a new version before making controlled changes.</div></section>
      <section className="card stack"><h2 className="sectionTitle">Add field</h2>{['published','retired','superseded'].includes(selected.status)?<p className="muted">Create a new version to edit this document.</p>:<form className="stack" onSubmit={addField}><label className="field"><span>Field label</span><input className="input" name="label" required/></label><label className="field"><span>Field type</span><select className="input" name="kind">{friendlyKinds.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label className="field"><span>Instructions / help text</span><input className="input" name="helpText"/></label><label className="field"><span>Weight (rating only)</span><input className="input" name="weight" type="number" min="0" max="100"/></label><label className="checkRow"><input type="checkbox" name="required"/> Required</label><button className="button">Add field</button></form>}</section></div>:<div className="card muted">Select a form first.</div>}
      {selected?<section className="card tableWrap"><h2 className="sectionTitle">Document fields</h2><table><thead><tr><th>Order</th><th>Label</th><th>Type</th><th>Required</th><th></th></tr></thead><tbody>{selected.fields.map((f,i)=><tr key={f.id}><td>{i+1}</td><td><strong>{f.label}</strong><div className="muted">{f.helpText||''}</div></td><td>{friendlyKinds.find(x=>x[0]===f.kind)?.[1]||f.kind}</td><td>{f.required?'Yes':'No'}</td><td>{!['published','retired','superseded'].includes(selected.status)?<button className="button secondary compact" onClick={()=>removeField(f.id)}>Remove</button>:null}</td></tr>)}</tbody></table></section>:null}</>:null}

    {tab==='submissions'?<section className="card tableWrap"><h2 className="sectionTitle">Submissions</h2><table><thead><tr><th>Submission</th><th>Template</th><th>Status</th><th>Score</th><th>Submitted</th><th>Export</th></tr></thead><tbody>{submissions.map(s=><tr key={s.id}><td>{s.id.slice(0,8)}</td><td>{s.templateId.slice(0,8)} · v{s.templateVersion}</td><td><span className="badge">{s.status.replaceAll('_',' ')}</span></td><td>{s.score?.weightedTotal==null?'—':`${Math.round(s.score.weightedTotal)}%`}</td><td>{new Date(s.submittedAt).toLocaleString()}</td><td><div className="row wrap"><button className="button secondary compact" onClick={()=>downloadSubmission(s.id,'pdf')}>PDF</button><button className="button secondary compact" onClick={()=>downloadSubmission(s.id,'docx')}>DOCX</button></div></td></tr>)}{!submissions.length?<tr><td colSpan={6} className="muted">No submissions yet.</td></tr>:null}</tbody></table></section>:null}

    {tab==='analytics'?<>{dashboard?<div className="grid4"><Metric label="Templates" value={dashboard.metrics.templates}/><Metric label="Published" value={dashboard.metrics.published}/><Metric label="Drafts" value={dashboard.metrics.drafts}/><Metric label="Open requests" value={dashboard.metrics.openRequests}/><Metric label="Submissions" value={dashboard.metrics.submissions}/><Metric label="Under review" value={dashboard.metrics.underReview}/><Metric label="OPSIQO-assisted" value={dashboard.metrics.aiGenerated}/></div>:null}<section className="card"><h2 className="sectionTitle">Category distribution</h2><div className="stack">{dashboard?.categories.map(x=><div key={x.category} className="runHeader"><strong>{x.category}</strong><span className="badge">{x.count}</span></div>)}</div></section></>:null}

    {tab==='governance'?<div className="grid2"><section className="card stack"><h2 className="sectionTitle">Document governance</h2><p>Templates, instances and submissions remain separate controlled records. Published versions are immutable and historical instances preserve their original snapshot.</p><div className="notice">PDF, DOCX and digital forms originate from the same governed template.</div></section><section className="card stack"><h2 className="sectionTitle">Promptless governed AI</h2><p>The end user never writes or supplies the AI prompt. OPSIQO composes it from the selected HR process, target context and organization evidence.</p><div className="notice">The Studio API rejects unknown properties, including a client-supplied prompt. AI drafts still require human approval before publication.</div></section></div>:null}
  </div>;
}
function Metric({label,value}:{label:string;value:number|string}){return <div className="card"><div className="metricLabel">{label}</div><div className="metricValue">{value}</div></div>}
