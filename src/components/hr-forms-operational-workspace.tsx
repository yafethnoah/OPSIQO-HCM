'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { activeOrgId, apiDownload, apiFetch } from '@/lib/http/client';
import { HrFormDocumentPreview } from '@/components/hr-form-document-preview';
import { HrFormFillWorkspace, type FillInstance } from '@/components/hr-form-fill-workspace';

type Field={id:string;kind:string;label:string;required?:boolean;helpText?:string;defaultValue?:unknown;scoring?:{enabled:boolean;weight?:number;anchors?:Record<string,string>};children?:Field[]};
type Template={id:string;formCode:string;title:string;description?:string;category:string;subcategory?:string;status:string;version:string;sensitivity:string;workflowId?:string;aiGenerated:boolean;aiGenerationMetadata?:Record<string,any>;fields:Field[];updatedAt:string};
type Submission={id:string;templateId:string;templateVersion:string;submittedBy:string;submittedAt:string;status:string;workflowRunId?:string;score?:{weightedTotal?:number}};
type Dashboard={metrics:{templates:number;published:number;drafts:number;openRequests:number;submissions:number;underReview:number;aiGenerated:number};categories:Array<{category:string;count:number}>};
type Option={id:string;kind:string;label:string;subtitle?:string};
type Intent={id:string;label:string;description:string;targetKind:'requisition'|'position'|'worker';pack:boolean};
type Brand={companyName?:string;legalName?:string;logoUrl?:string;primaryColor?:string;accentColor?:string;footer?:string};
type StudioOptions={organization:{id:string;name:string;brand?:Brand};intents:Intent[];requisitions:Option[];positions:Option[];workers:Option[];workflows:Option[]};
type PackSummary={id:string;name:string;intent:string;status:string;templateIds:string[];instanceIds?:string[];formCount?:number;targetKind?:string;targetId?:string;createdAt:string;updatedAt:string};
type PackWorkspace={pack:PackSummary;templates:Template[];instances:FillInstance[];progress:{total:number;started:number;submitted:number;percent:number;complete:boolean}};
type Tab='studio'|'library'|'packs'|'preview'|'fill'|'submissions'|'analytics'|'governance';

const friendlyKinds:[string,string][]=[['text','Short answer'],['textarea','Long answer'],['number','Number'],['date','Date'],['email','Email'],['phone','Phone'],['dropdown','Dropdown'],['multi_select','Multiple choice'],['yes_no','Yes / No'],['scale_1_5','1–5 rating'],['signature','Signature'],['attachment','Attachment'],['acknowledgement','Acknowledgement'],['section','Section'],['instruction','Instruction']];

export function HrFormsOperationalWorkspace(){
  const [tab,setTab]=useState<Tab>('studio');
  const [templates,setTemplates]=useState<Template[]>([]),[submissions,setSubmissions]=useState<Submission[]>([]),[dashboard,setDashboard]=useState<Dashboard|null>(null),[options,setOptions]=useState<StudioOptions|null>(null),[packs,setPacks]=useState<PackSummary[]>([]);
  const [selectedId,setSelectedId]=useState(''),[selectedPack,setSelectedPack]=useState<PackWorkspace|null>(null),[activeInstance,setActiveInstance]=useState<FillInstance|null>(null);
  const [intent,setIntent]=useState('recruitment'),[output,setOutput]=useState<'single'|'pack'>('single'),[targetId,setTargetId]=useState(''),[notes,setNotes]=useState(''),[assignWorkerId,setAssignWorkerId]=useState('');
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[studioResult,setStudioResult]=useState<any>(null),[moreOpen,setMoreOpen]=useState(false),[advancedOpen,setAdvancedOpen]=useState(false);

  const org=()=>activeOrgId();
  const selected=useMemo(()=>templates.find(x=>x.id===selectedId)||null,[templates,selectedId]);
  const chosenIntent=options?.intents.find(x=>x.id===intent);
  const targetOptions=chosenIntent?.targetKind==='requisition'?options?.requisitions:chosenIntent?.targetKind==='worker'?options?.workers:options?.positions;
  const selectedInPack=Boolean(selectedPack?.templates.some(t=>t.id===selectedId));

  async function load(){
    try{
      const [t,d,s,o,p]=await Promise.all([
        apiFetch<{data:Template[]}>(`/api/organizations/${org()}/hr-forms/templates`),
        apiFetch<{data:Dashboard}>(`/api/organizations/${org()}/hr-forms/dashboard`),
        apiFetch<{data:Submission[]}>(`/api/organizations/${org()}/hr-forms/submissions`).catch(()=>({data:[]})),
        apiFetch<{data:StudioOptions}>(`/api/organizations/${org()}/hr-forms/studio/options`),
        apiFetch<{data:PackSummary[]}>(`/api/organizations/${org()}/hr-forms/packs`).catch(()=>({data:[]})),
      ]);
      setTemplates(t.data);setDashboard(d.data);setSubmissions(s.data);setOptions(o.data);setPacks(p.data);
      setSelectedId(x=>x&&t.data.some(y=>y.id===x)?x:(t.data[0]?.id||''));setError('');
    }catch(e){setError(e instanceof Error?e.message:'Unable to load HR Forms.');}
  }
  useEffect(()=>{void load();},[]);

  function chooseIntent(id:string){setIntent(id);setTargetId('');const i=options?.intents.find(x=>x.id===id);setOutput(i?.pack?'pack':'single');}

  async function generate(e:FormEvent){
    e.preventDefault();setBusy(true);setError('');setNotice('');
    try{
      const i=options?.intents.find(x=>x.id===intent);
      const r=await apiFetch<{data:any}>(`/api/organizations/${org()}/hr-forms/studio/generate`,{
        method:'POST',
        body:JSON.stringify({intent,output,targetKind:i?.targetKind,targetId:targetId||undefined,notes:notes||undefined}),
        reconcileOnServerError:false
      });
      setStudioResult(r.data);
      setNotice(r.data.aiEnhancement?.status==='completed'
        ?`${r.data.templates.length} professional ${r.data.templates.length===1?'form':'forms'} created with organization-aware AI enhancement.`
        :`${r.data.templates.length} professional ${r.data.templates.length===1?'form':'forms'} created successfully. ${r.data.aiEnhancement?.warning||'AI enhancement can be retried later.'}`);
      await load();
      setSelectedId(r.data.templates[0]?.id||'');
      if(r.data.pack?.id)await openPack(r.data.pack.id,false);
      setTab('preview');
    }catch(e){
      const message=e instanceof Error?e.message:'Intelligent form generation failed.';
      setError(/Gemini|OpenAI|provider|402|429/i.test(message)
        ?'OPSIQO could not complete the optional AI enhancement. Professional form generation remains available; try again.'
        :message);
    }finally{setBusy(false);}
  }

  async function action(action:string,patch?:unknown){
    if(!selected)return;
    setBusy(true);setError('');
    try{
      const r=await apiFetch<{data:Template}>(`/api/organizations/${org()}/hr-forms/templates/${selected.id}`,{method:'PATCH',body:JSON.stringify({action,patch})});
      setNotice(`Form ${action.replaceAll('_',' ')} completed.`);
      await load();setSelectedId(r.data.id);
    }catch(e){setError(e instanceof Error?e.message:'Unable to update form.');}
    finally{setBusy(false);}
  }

  async function addField(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(!selected)return;
    const form=e.currentTarget,f=new FormData(form),label=String(f.get('label')||'').trim(),kind=String(f.get('kind')||'text'),id=`f_${Date.now().toString(36)}`;
    const field:Field={id,kind,label,required:f.get('required')==='on',helpText:String(f.get('helpText')||'').trim()||undefined};
    if(kind==='scale_1_5')field.scoring={enabled:true,weight:Number(f.get('weight')||0)||undefined};
    await action('save',{fields:[...selected.fields.filter(x=>x.id!=='ai_review_guidance'),field]});form.reset();
  }
  async function removeField(id:string){if(!selected)return;await action('save',{fields:selected.fields.filter(x=>x.id!==id&&x.id!=='ai_review_guidance')});}

  async function downloadTemplate(id:string,format:'pdf'|'docx'){try{
    const r=await apiDownload(`/api/organizations/${org()}/hr-forms/templates/${id}/export?format=${format}`);
    downloadBlob(r.blob,r.fileName||`HR_Form.${format}`);
  }catch(e){setError(e instanceof Error?e.message:'Download failed.');}}
  async function downloadPack(packId:string,format:'pdf'|'docx'){try{
    const r=await apiDownload(`/api/organizations/${org()}/hr-forms/packs/${packId}/export?format=${format}`);
    downloadBlob(r.blob,r.fileName||`OPSIQO_HR_Form_Pack.${format}`);
  }catch(e){setError(e instanceof Error?e.message:'Form pack download failed.');}}
  async function downloadSubmission(id:string,format:'pdf'|'docx'){try{
    const r=await apiDownload(`/api/organizations/${org()}/hr-forms/submissions/${id}/export?format=${format}`);
    downloadBlob(r.blob,r.fileName||`HR_Form.${format}`);
  }catch(e){setError(e instanceof Error?e.message:'Download failed.');}}

  async function retryEnhancement(){
    if(!studioResult?.templates?.length)return;
    setBusy(true);setError('');
    try{
      const i=options?.intents.find(x=>x.id===intent);
      const r=await apiFetch<{data:any}>(`/api/organizations/${org()}/hr-forms/studio/enhance`,{
        method:'POST',
        body:JSON.stringify({intent,output,templateIds:studioResult.templates.map((t:Template)=>t.id),targetKind:i?.targetKind,targetId:targetId||undefined,notes:notes||undefined}),
        reconcileOnServerError:false
      });
      setStudioResult({...studioResult,templates:r.data.templates?.length?r.data.templates:studioResult.templates,aiEnhancement:r.data});
      setNotice(r.data.status==='completed'
        ?'AI enhancement completed. Review guidance is available separately from the operational form.'
        :r.data.warning||'AI enhancement is still unavailable. Your professional forms remain ready.');
      await load();
    }catch{setError('AI enhancement could not be completed. Your generated professional forms remain available.');}
    finally{setBusy(false);}
  }

  async function startSingle(){
    if(!selected||selected.status!=='published')return;
    setBusy(true);setError('');
    try{
      const body:any={templateId:selected.id,subject:assignWorkerId?{workerType:'employee',workerId:assignWorkerId}:{workerType:'employee'}};
      const r=await apiFetch<{data:FillInstance}>(`/api/organizations/${org()}/hr-forms/instances`,{method:'POST',body:JSON.stringify(body)});
      setActiveInstance(r.data);setTab('fill');setNotice('Form instance created. Complete it directly in OPSIQO.');
    }catch(e){setError(e instanceof Error?e.message:'Unable to start form.');}
    finally{setBusy(false);}
  }

  async function openPack(id:string,switchTab=true){
    setBusy(true);setError('');
    try{
      const r=await apiFetch<{data:PackWorkspace}>(`/api/organizations/${org()}/hr-forms/packs/${id}`);
      setSelectedPack(r.data);setAssignWorkerId(String(r.data.pack.targetId||''));
      if(switchTab)setTab('packs');
    }catch(e){setError(e instanceof Error?e.message:'Unable to load form pack.');}
    finally{setBusy(false);}
  }

  async function packAction(actionName:'submit_review'|'approve'|'publish'){
    if(!selectedPack)return;
    setBusy(true);setError('');
    try{
      const r=await apiFetch<{data:PackWorkspace}>(`/api/organizations/${org()}/hr-forms/packs/${selectedPack.pack.id}`,{method:'PATCH',body:JSON.stringify({action:actionName})});
      setSelectedPack(r.data);setNotice(`Pack ${actionName.replaceAll('_',' ')} completed.`);await load();
    }catch(e){setError(e instanceof Error?e.message:'Unable to update form pack.');}
    finally{setBusy(false);}
  }

  async function startPack(){
    if(!selectedPack)return;
    setBusy(true);setError('');
    try{
      const r=await apiFetch<{data:PackWorkspace}>(`/api/organizations/${org()}/hr-forms/packs/${selectedPack.pack.id}/start`,{
        method:'POST',
        body:JSON.stringify({workerId:assignWorkerId||undefined})
      });
      setSelectedPack(r.data);setNotice('Pack started. OPSIQO created governed digital form instances and is tracking completion.');await load();
    }catch(e){setError(e instanceof Error?e.message:'Unable to start form pack.');}
    finally{setBusy(false);}
  }

  function openInstance(instance:FillInstance){setActiveInstance(instance);setTab('fill');}

  const guidance=selected?reviewGuidance(selected):[];

  return <div className="stack">
    <div className="toolbar">
      <div className="row wrap">{([
        ['studio','Create Form'],['library','Form Library'],['packs','Form Packs'],['submissions','Submissions'],['analytics','Analytics'],['governance','Governance']
      ] as [Tab,string][]).map(([id,label])=><button key={id} className={`button ${tab===id?'':'secondary'}`} onClick={()=>setTab(id)}>{label}</button>)}</div>
    </div>

    {error?<div className="error">{error}</div>:null}
    {notice?<div className="success">{notice}</div>:null}

    {tab==='studio'?<div className="stack">
      <section className="card stack" style={{padding:'28px'}}>
        <div>
          <span className="eyebrow">Intelligent Form Studio</span>
          <h2 className="sectionTitle" style={{fontSize:26}}>What do you need OPSIQO to create?</h2>
          <p className="muted">Choose the HR process. OPSIQO finds relevant organization context, writes the prompt itself, and creates the professional digital/PDF/DOCX documents.</p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:12}}>
          {options?.intents.map(i=><button type="button" key={i.id} onClick={()=>chooseIntent(i.id)} style={{textAlign:'left',border:intent===i.id?'2px solid #1ABCBC':'1px solid #cbd5e1',borderRadius:12,padding:16,background:intent===i.id?'#123f48':'#ffffff',color:intent===i.id?'#ffffff':'#0f172a',cursor:'pointer',boxShadow:intent===i.id?'0 0 0 1px rgba(26,188,188,.18)':'0 1px 3px rgba(15,23,42,.08)'}}>
            <strong style={{display:'block',fontSize:16,color:intent===i.id?'#ffffff':'#0f172a'}}>{i.label}</strong>
            <span style={{fontSize:12,color:intent===i.id?'#d9f5f1':'#475569'}}>{i.description}</span>
          </button>)}
        </div>
      </section>

      <section className="grid2">
        <form className="card stack" onSubmit={generate}>
          <div><span className="eyebrow">Step 2</span><h2 className="sectionTitle">OPSIQO prepares everything</h2></div>
          {chosenIntent?.pack?<label className="field"><span>What should be created?</span><select className="input" value={output} onChange={e=>setOutput(e.target.value as any)}><option value="pack">Complete form pack — recommended</option><option value="single">Single primary form</option></select></label>:<div className="notice"><strong>Output:</strong> Complete professional form</div>}
          <label className="field"><span>{chosenIntent?.targetKind==='requisition'?'Use this vacancy / requisition':chosenIntent?.targetKind==='worker'?'Pre-fill for this employee (optional)':'Use this position (optional)'}</span>
            <select className="input" value={targetId} onChange={e=>setTargetId(e.target.value)}><option value="">Reusable template — no specific record</option>{targetOptions?.map(o=><option key={o.id} value={o.id}>{o.label}{o.subtitle?` — ${o.subtitle}`:''}</option>)}</select>
          </label>
          <label className="field"><span>Anything else OPSIQO should know? <span className="muted">(optional)</span></span><textarea className="input" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Example: Include a second manager approval or bilingual acknowledgement."/></label>
          <div className="notice"><strong>No prompt needed.</strong> OPSIQO writes the governed prompt automatically. AI review guidance is kept separate from the operational form.</div>
          <button className="button" disabled={busy}>{busy?'Building professional forms…':output==='pack'?'Generate complete form pack':'Generate complete form'}</button>
        </form>

        <section className="card stack">
          <span className="eyebrow">Operational workflow</span><h2 className="sectionTitle">Generate → govern → use</h2>
          {['Generate professional forms','Review AI guidance separately','Submit for review','Approve','Publish','Assign / fill inside OPSIQO','Submit into workflow','Track pack completion and archive outputs'].map((x,i)=><div key={x} style={{display:'flex',gap:12}}><span className="badge">{i+1}</span><span>{x}</span></div>)}
        </section>
      </section>

      {studioResult?<section className="card stack">
        <div className="toolbar"><div><span className="eyebrow">Generation complete</span><h2 className="sectionTitle">{studioResult.templates.length} professional form{studioResult.templates.length===1?'':'s'} ready</h2></div><span className="badge">Prompt written by OPSIQO</span></div>
        <div className="row wrap">{studioResult.templates.map((t:Template)=><button className="button secondary" key={t.id} onClick={()=>{setSelectedId(t.id);setTab('preview')}}>{t.title}</button>)}</div>
        <div className="row wrap">
          {studioResult.pack?.id?<><button className="button" onClick={()=>openPack(studioResult.pack.id)}>Open pack workspace</button><button className="button secondary" onClick={()=>downloadPack(studioResult.pack.id,'pdf')}>Complete pack PDF</button><button className="button secondary" onClick={()=>downloadPack(studioResult.pack.id,'docx')}>Complete pack DOCX</button></>:null}
          {studioResult.aiEnhancement?.canRetry?<button className="button secondary" disabled={busy} onClick={retryEnhancement}>Retry AI enhancement</button>:null}
        </div>
        {studioResult.aiEnhancement?.status!=='completed'&&studioResult.aiEnhancement?.warning?<div className="notice"><strong>Forms ready:</strong> {studioResult.aiEnhancement.warning}</div>:null}
      </section>:null}
    </div>:null}

    {tab==='library'?<section className="card tableWrap">
      <div className="toolbar"><div><span className="eyebrow">Controlled documents</span><h2 className="sectionTitle">Form Library</h2></div><button className="button" onClick={()=>setTab('studio')}>Create HR Form</button></div>
      <table><thead><tr><th>Form</th><th>Category</th><th>Version</th><th>Status</th><th>Outputs</th></tr></thead><tbody>
        {templates.map(t=><tr key={t.id}><td><button style={{background:'none',border:0,padding:0,textAlign:'left',cursor:'pointer'}} onClick={()=>{setSelectedId(t.id);setSelectedPack(null);setTab('preview')}}><strong>{t.title}</strong><div className="muted">{t.formCode}{t.aiGenerated?' · OPSIQO-assisted':''}</div></button></td><td>{t.category}</td><td>v{t.version}</td><td><span className="badge">{t.status.replaceAll('_',' ')}</span></td><td><div className="row wrap"><button className="button secondary compact" onClick={()=>downloadTemplate(t.id,'pdf')}>PDF</button><button className="button secondary compact" onClick={()=>downloadTemplate(t.id,'docx')}>DOCX</button></div></td></tr>)}
        {!templates.length?<tr><td colSpan={5} className="muted">No forms yet.</td></tr>:null}
      </tbody></table>
    </section>:null}

    {tab==='packs'?<div className="grid2">
      <section className="card tableWrap">
        <div className="toolbar"><div><span className="eyebrow">Operational bundles</span><h2 className="sectionTitle">Form Packs</h2></div></div>
        <table><thead><tr><th>Pack</th><th>Forms</th><th>Status</th></tr></thead><tbody>
          {packs.map(p=><tr key={p.id} style={{cursor:'pointer'}} onClick={()=>openPack(p.id)}><td><strong>{p.name}</strong><div className="muted">{new Date(p.createdAt).toLocaleString()}</div></td><td>{p.formCount||p.templateIds?.length||0}</td><td><span className="badge">{p.status.replaceAll('_',' ')}</span></td></tr>)}
          {!packs.length?<tr><td colSpan={3} className="muted">No form packs yet.</td></tr>:null}
        </tbody></table>
      </section>
      <PackPanel workspace={selectedPack} workers={options?.workers||[]} workerId={assignWorkerId} setWorkerId={setAssignWorkerId} busy={busy} onAction={packAction} onStart={startPack} onPreview={(id)=>{setSelectedId(id);setTab('preview')}} onFill={openInstance} onDownload={downloadPack}/>
    </div>:null}

    {tab==='preview'?<div className="stack">
      {selected?<><section className="card">
        <div className="toolbar">
          <div><span className="eyebrow">Professional document preview</span><h2 className="sectionTitle">{selected.title}</h2></div>
          <div className="row wrap">
            <button className="button secondary" onClick={()=>downloadTemplate(selected.id,'pdf')}>Fillable PDF</button>
            <button className="button secondary" onClick={()=>downloadTemplate(selected.id,'docx')}>Editable DOCX</button>
            <div style={{position:'relative'}}>
              <button className="button secondary" onClick={()=>setMoreOpen(v=>!v)}>More ⋯</button>
              {moreOpen?<div className="card" style={{position:'absolute',right:0,top:'110%',zIndex:5,minWidth:210,padding:10}}>
                {!['published','retired','superseded'].includes(selected.status)?<button className="button secondary" style={{width:'100%'}} onClick={()=>{setAdvancedOpen(v=>!v);setMoreOpen(false)}}>Advanced Editor</button>:null}
                {selected.status==='published'?<button className="button secondary" style={{width:'100%',marginTop:6}} onClick={()=>{void action('new_version');setMoreOpen(false)}}>Create new version</button>:null}
                <button className="button secondary" style={{width:'100%',marginTop:6}} onClick={()=>{setTab('governance');setMoreOpen(false)}}>Governance</button>
              </div>:null}
            </div>
          </div>
        </div>

        <div className="row wrap" style={{marginTop:14}}>
          {selectedInPack?<button className="button" onClick={()=>setTab('packs')}>Manage lifecycle in pack workspace</button>:<>
            {selected.status==='draft'?<button className="button" onClick={()=>action('submit_review')}>Submit for review</button>:null}
            {selected.status==='under_review'?<button className="button" onClick={()=>action('approve')}>Approve</button>:null}
            {selected.status==='approved'?<button className="button" onClick={()=>action('publish')}>Publish</button>:null}
            {selected.status==='published'?<>
              <label className="field" style={{minWidth:260}}><span>Assign / pre-fill employee (optional)</span><select className="input" value={assignWorkerId} onChange={e=>setAssignWorkerId(e.target.value)}><option value="">No employee selected</option>{options?.workers.map(w=><option key={w.id} value={w.id}>{w.label}{w.subtitle?` — ${w.subtitle}`:''}</option>)}</select></label>
              <button className="button" disabled={busy} onClick={startSingle}>Start / Fill Form</button>
            </>:null}
          </>}
        </div>
      </section>

      {guidance.length?<section className="card stack">
        <div><span className="eyebrow">OPSIQO Review Panel</span><h2 className="sectionTitle">AI-assisted review guidance</h2></div>
        <div className="notice">This guidance is for authorized HR review only. It is not part of the operational form and is excluded from PDF/DOCX exports.</div>
        {guidance.map((g,i)=><div key={i} style={{display:'flex',gap:10}}><span className="badge">{i+1}</span><span>{normalizeGuidance(g)}</span></div>)}
      </section>:null}

      <HrFormDocumentPreview template={selected} organization={options?.organization.name||'Organization'} brand={options?.organization.brand}/>

      {advancedOpen&&!['published','retired','superseded'].includes(selected.status)?<section className="card stack">
        <div><span className="eyebrow">Advanced Editor</span><h2 className="sectionTitle">Exceptional field-level changes</h2><p className="muted">Most users should not need this editor. Published documents remain immutable.</p></div>
        <form className="grid2" onSubmit={addField}>
          <label className="field"><span>Field label</span><input className="input" name="label" required/></label>
          <label className="field"><span>Field type</span><select className="input" name="kind">{friendlyKinds.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
          <label className="field"><span>Instructions / help</span><input className="input" name="helpText"/></label>
          <label className="field"><span>Weight (rating only)</span><input className="input" name="weight" type="number" min="0" max="100"/></label>
          <label className="checkRow"><input type="checkbox" name="required"/> Required</label>
          <button className="button">Add field</button>
        </form>
        <div className="tableWrap"><table><thead><tr><th>Field</th><th>Type</th><th></th></tr></thead><tbody>
          {selected.fields.filter(f=>f.id!=='ai_review_guidance').map(f=><tr key={f.id}><td>{f.label}</td><td>{friendlyKinds.find(x=>x[0]===f.kind)?.[1]||f.kind}</td><td><button className="button secondary compact" onClick={()=>removeField(f.id)}>Remove</button></td></tr>)}
        </tbody></table></div>
      </section>:null}
      </>:<div className="card muted">Select a form from the library or a pack.</div>}
    </div>:null}

    {tab==='fill'&&activeInstance?<HrFormFillWorkspace instance={activeInstance} onCancel={()=>setTab(selectedPack?'packs':'preview')} onSubmitted={async()=>{setNotice('Form submitted successfully. OPSIQO created the governed submission record and triggered any linked workflow.');setActiveInstance(null);if(selectedPack)await openPack(selectedPack.pack.id,false);await load();setTab(selectedPack?'packs':'submissions')}}/>:null}

    {tab==='submissions'?<section className="card tableWrap">
      <h2 className="sectionTitle">Submissions</h2>
      <table><thead><tr><th>Submission</th><th>Template</th><th>Status</th><th>Score</th><th>Submitted</th><th>Export</th></tr></thead><tbody>
        {submissions.map(s=><tr key={s.id}><td>{s.id.slice(0,8)}</td><td>{s.templateId.slice(0,8)} · v{s.templateVersion}</td><td><span className="badge">{s.status.replaceAll('_',' ')}</span></td><td>{s.score?.weightedTotal==null?'—':`${Math.round(s.score.weightedTotal)}%`}</td><td>{new Date(s.submittedAt).toLocaleString()}</td><td><div className="row wrap"><button className="button secondary compact" onClick={()=>downloadSubmission(s.id,'pdf')}>PDF</button><button className="button secondary compact" onClick={()=>downloadSubmission(s.id,'docx')}>DOCX</button></div></td></tr>)}
        {!submissions.length?<tr><td colSpan={6} className="muted">No submissions yet.</td></tr>:null}
      </tbody></table>
    </section>:null}

    {tab==='analytics'?<>{dashboard?<div className="grid4">
      <Metric label="Templates" value={dashboard.metrics.templates}/><Metric label="Published" value={dashboard.metrics.published}/><Metric label="Drafts" value={dashboard.metrics.drafts}/><Metric label="Open requests" value={dashboard.metrics.openRequests}/><Metric label="Submissions" value={dashboard.metrics.submissions}/><Metric label="Under review" value={dashboard.metrics.underReview}/><Metric label="OPSIQO-assisted" value={dashboard.metrics.aiGenerated}/>
    </div>:null}<section className="card"><h2 className="sectionTitle">Category distribution</h2><div className="stack">{dashboard?.categories.map(x=><div key={x.category} className="runHeader"><strong>{x.category}</strong><span className="badge">{x.count}</span></div>)}</div></section></>:null}

    {tab==='governance'?<div className="grid2">
      <section className="card stack"><h2 className="sectionTitle">Lifecycle & records</h2><p>Normal lifecycle is Draft → Review → Approve → Publish → Assign/Fill → Submit → Workflow/Record. Only the valid next lifecycle action is shown prominently.</p><div className="notice">Published templates are immutable. Form instances preserve the published version snapshot.</div></section>
      <section className="card stack"><h2 className="sectionTitle">AI & workflow governance</h2><p>OPSIQO writes the AI prompt. AI review guidance is stored separately from the operational document. Provider failures never block deterministic form creation.</p><a className="button secondary" href="/workflows">Open Workflow Designer</a></section>
    </div>:null}
  </div>;
}

function PackPanel({
  workspace,workers,workerId,setWorkerId,busy,onAction,onStart,onPreview,onFill,onDownload
}:{
  workspace:PackWorkspace|null;workers:Option[];workerId:string;setWorkerId:(v:string)=>void;busy:boolean;
  onAction:(a:'submit_review'|'approve'|'publish')=>void;onStart:()=>void;onPreview:(id:string)=>void;onFill:(i:FillInstance)=>void;onDownload:(id:string,f:'pdf'|'docx')=>void;
}){
  if(!workspace)return <section className="card muted">Select a pack to open its operational workspace.</section>;
  const {pack,templates,instances,progress}=workspace;
  const instanceByTemplate=new Map(instances.map(i=>[i.templateId,i]));
  return <section className="card stack">
    <div className="toolbar"><div><span className="eyebrow">Pack workspace</span><h2 className="sectionTitle">{pack.name}</h2><p className="muted">{progress.submitted}/{progress.total} completed · {progress.percent}%</p></div><span className="badge">{pack.status.replaceAll('_',' ')}</span></div>
    <div style={{height:10,borderRadius:999,background:'#e2e8f0',overflow:'hidden'}}><div style={{height:'100%',width:`${progress.percent}%`,background:'#1ABCBC'}}/></div>

    <div className="row wrap">
      <button className="button secondary" onClick={()=>onDownload(pack.id,'pdf')}>Complete pack PDF</button>
      <button className="button secondary" onClick={()=>onDownload(pack.id,'docx')}>Complete pack DOCX</button>
      {pack.status==='draft'?<button className="button" disabled={busy} onClick={()=>onAction('submit_review')}>Submit pack for review</button>:null}
      {pack.status==='under_review'?<button className="button" disabled={busy} onClick={()=>onAction('approve')}>Approve pack</button>:null}
      {pack.status==='approved'?<button className="button" disabled={busy} onClick={()=>onAction('publish')}>Publish pack</button>:null}
    </div>

    {pack.status==='published'?<div className="stack">
      <label className="field"><span>Assign / pre-fill employee (optional)</span><select className="input" value={workerId} onChange={e=>setWorkerId(e.target.value)}><option value="">No employee selected</option>{workers.map(w=><option key={w.id} value={w.id}>{w.label}{w.subtitle?` — ${w.subtitle}`:''}</option>)}</select></label>
      <button className="button" disabled={busy} onClick={onStart}>Start complete pack</button>
    </div>:null}

    {pack.status==='in_progress'||pack.status==='completed'?<div className="notice"><strong>Operational tracking:</strong> OPSIQO created digital instances for this pack. Open each outstanding form below to complete it.</div>:null}

    <div className="tableWrap"><table><thead><tr><th>Document</th><th>Template</th><th>Instance</th><th>Action</th></tr></thead><tbody>
      {templates.map(t=>{const i=instanceByTemplate.get(t.id);return <tr key={t.id}><td><strong>{t.title}</strong><div className="muted">{t.formCode}</div></td><td><span className="badge">{t.status.replaceAll('_',' ')}</span></td><td>{i?<span className="badge">{i.status}</span>:'Not started'}</td><td><div className="row wrap"><button className="button secondary compact" onClick={()=>onPreview(t.id)}>Preview</button>{i?.status==='open'?<button className="button compact" onClick={()=>onFill(i)}>Fill</button>:null}</div></td></tr>})}
    </tbody></table></div>
  </section>;
}

function reviewGuidance(template:Template):string[]{
  const meta=template.aiGenerationMetadata||{};
  const direct=Array.isArray(meta.reviewGuidance)?meta.reviewGuidance.map(String):[];
  if(direct.length)return direct;
  const legacy=template.fields.find(f=>f.id==='ai_review_guidance');
  return legacy?.children?.map(c=>String(c.label||'')).filter(Boolean)||[];
}

function normalizeGuidance(value:string){
  const text=String(value||'').trim();
  if(/complete lack|lack of organization-specific|no organization-specific/i.test(text)){
    return 'Organization-specific evidence was not available for this review point. Verify the applicable policy, process or record before publication.';
  }
  return text;
}

function downloadBlob(blob:Blob,fileName:string){
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=fileName;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}

function Metric({label,value}:{label:string;value:number|string}){return <div className="card"><div className="metricLabel">{label}</div><div className="metricValue">{value}</div></div>}
