'use client';
import { FormEvent, useMemo, useRef, useState } from 'react';
import { activeOrgId, apiFetch } from '@/lib/http/client';

type PreviewRow={
  rowNumber:number;
  legalFirstName:string;
  legalLastName:string;
  workEmail:string;
  phone?:string;
  employeeNumber?:string;
  employmentType:string;
  hireDate:string;
  orgUnitSource?:string;
  positionSource?:string;
  orgUnitId?:string;
  positionId?:string;
  managerReference?:string;
  managerWorkerId?:string;
  managerRowNumber?:number;
  reviewedFields?:string[];
  errors:string[];
  warnings:string[];
};

type PreviewOptions={
  orgUnits:Array<{id:string;name:string;code:string}>;
  positions:Array<{id:string;title:string;orgUnitId:string;availableHeadcount:number;capacityState:string}>;
  managers:Array<{id:string;displayName:string;employeeNumber:string;workEmail:string}>;
};

type Preview={
  previewId:string;
  fileName:string;
  fileSha256:string;
  sourceType?:string;
  parser?:string;
  warnings?:string[];
  rowCount:number;
  readyCount:number;
  blockedCount:number;
  expiresAt:string;
  headers:string[];
  rows:PreviewRow[];
  options:PreviewOptions;
};

type EditDraft={
  legalFirstName:string;
  legalLastName:string;
  workEmail:string;
  phone:string;
  employeeNumber:string;
  employmentType:string;
  hireDate:string;
  orgUnitId:string;
  positionId:string;
  managerWorkerId:string;
};

const EMPTY_DRAFT:EditDraft={legalFirstName:'',legalLastName:'',workEmail:'',phone:'',employeeNumber:'',employmentType:'permanent',hireDate:'',orgUnitId:'',positionId:'',managerWorkerId:''};

export function EmployeeImportPanel({title='Import employees',detail='Upload workforce data and review the mapped employee records before OPSIQO writes to Core HR.',embedded=false}:{title?:string;detail?:string;embedded?:boolean}){
  const[preview,setPreview]=useState<Preview|null>(null);
  const[busy,setBusy]=useState('');
  const[error,setError]=useState('');
  const[notice,setNotice]=useState('');
  const[fileName,setFileName]=useState('');
  const[editingRow,setEditingRow]=useState<number|null>(null);
  const[draft,setDraft]=useState<EditDraft>(EMPTY_DRAFT);
  const formRef=useRef<HTMLFormElement|null>(null);

  const availablePositions=useMemo(()=>{
    if(!preview||!draft.orgUnitId)return[];
    return preview.options.positions.filter(p=>p.orgUnitId===draft.orgUnitId&&(p.availableHeadcount>0||p.id===draft.positionId)&&!['full','closed','frozen'].includes(p.capacityState.toLowerCase()));
  },[preview,draft.orgUnitId,draft.positionId]);

  const reviewCounts=useMemo(()=>{
    if(!preview)return{readyCount:0,blockedCount:0,serverMismatch:false};
    const readyCount=preview.rows.filter(row=>(row.errors||[]).length===0).length;
    const blockedCount=preview.rows.length-readyCount;
    return{
      readyCount,
      blockedCount,
      serverMismatch:readyCount!==preview.readyCount||blockedCount!==preview.blockedCount,
    };
  },[preview]);

  async function createPreview(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy('preview');setError('');setNotice('');setEditingRow(null);
    try{
      const f=new FormData(e.currentTarget);
      const r=await apiFetch<{data:Preview}>(`/api/organizations/${activeOrgId()}/imports/employees`,{method:'POST',body:f});
      setPreview(r.data);
      setNotice(`${r.data.sourceType||'Source'} parsed with ${(r.data.parser||'governed mapping').replaceAll('_',' ')}. Review and complete any missing information below. No employee records have been written yet.`);
    }catch(e){setError(e instanceof Error?e.message:'Employee import preview failed.')}
    finally{setBusy('')}
  }

  function beginEdit(row:PreviewRow){
    setEditingRow(row.rowNumber);
    setDraft({
      legalFirstName:row.legalFirstName||'',
      legalLastName:row.legalLastName||'',
      workEmail:row.workEmail||'',
      phone:row.phone||'',
      employeeNumber:row.employeeNumber||'',
      employmentType:row.employmentType||'permanent',
      hireDate:row.hireDate||'',
      orgUnitId:row.orgUnitId||'',
      positionId:row.positionId||'',
      managerWorkerId:row.managerWorkerId||'',
    });
    setError('');
  }

  async function saveCorrection(){
    if(!preview||editingRow===null)return;
    setBusy(`row-${editingRow}`);setError('');setNotice('');
    try{
      const r=await apiFetch<{data:Preview}>(`/api/organizations/${activeOrgId()}/imports/employees`,{
        method:'PATCH',
        body:JSON.stringify({previewId:preview.previewId,rowNumber:editingRow,corrections:draft}),
      });
      setPreview(r.data);
      const corrected=r.data.rows.find(x=>x.rowNumber===editingRow);
      if(corrected?.errors.length){
        setNotice(`Row ${editingRow} was saved and revalidated. ${corrected.errors.length} item(s) still need review.`);
      }else{
        setNotice(`Row ${editingRow} is now ready for import.`);
        setEditingRow(null);
      }
    }catch(e){setError(e instanceof Error?e.message:'Unable to save the employee review.')}
    finally{setBusy('')}
  }

  async function commit(){
    if(!preview||reviewCounts.blockedCount)return;
    setBusy('commit');setError('');
    try{
      const r=await apiFetch<{data:{createdCount:number;expectedCount:number}}>(`/api/organizations/${activeOrgId()}/imports/employees`,{method:'POST',body:JSON.stringify({action:'commit',previewId:preview.previewId})});
      setNotice(`Authoritative employee import completed: ${r.data.createdCount}/${r.data.expectedCount} created.`);
      setPreview(null);setFileName('');setEditingRow(null);setDraft(EMPTY_DRAFT);formRef.current?.reset();
      window.dispatchEvent(new CustomEvent('opsiqo:employees-imported',{detail:{createdCount:r.data.createdCount}}));
    }catch(e){setError(e instanceof Error?e.message:'Employee import did not complete.')}
    finally{setBusy('')}
  }

  return <section className={`${embedded?'':'card '}stack employeeImportPanel`}>
    <form ref={formRef} className="stack" onSubmit={createPreview}>
      <div className="toolbar"><div><h2 className="sectionTitle">{title}</h2><p className="muted">{detail}</p></div><span className="badge">CSV · XLSX · PDF</span></div>
      <div className="row wrap"><label className="button secondary">Choose employee import file<input aria-label="Employee import file" className="srOnly" name="file" type="file" accept=".csv,.xlsx,.pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf" required onChange={e=>setFileName(e.currentTarget.files?.[0]?.name||'')}/></label><span className="muted" role="status">{fileName||'No file selected'}</span></div>
      <div className="row wrap"><button className="button" disabled={busy==='preview'}>{busy==='preview'?'Parsing & mapping…':'Parse & create review preview'}</button><a className="button secondary" href="/templates/employee-import-template.csv" download>Download CSV template</a>{preview&&<button type="button" className="button secondary" onClick={()=>{setPreview(null);setEditingRow(null)}}>Clear preview</button>}</div>
      <details><summary>How employee parsing works</summary><p className="muted">OPSIQO first extracts and maps the employee information it can identify. Missing or invalid values can then be completed directly in the review preview. Every correction is revalidated against authoritative organization units, position capacity, existing employees and manager relationships before commit.</p></details>
    </form>

    {error&&<div className="error" role="alert">{error}</div>}
    {notice&&<div className="success" role="status">{notice}</div>}

    {preview&&<div className="stack insetCard">
      <div className="toolbar">
        <div><h3>Review & complete · {preview.fileName}</h3><p className="muted">{preview.sourceType||'Source'} · {(preview.parser||'parser').replaceAll('_',' ')} · SHA-256 {preview.fileSha256.slice(0,16)}…</p></div>
        <div className="row wrap"><span className="badge" data-testid="employee-import-ready-count">{reviewCounts.readyCount} ready</span><span className="badge" data-testid="employee-import-review-count">{reviewCounts.blockedCount} need review</span></div>
      </div>

      {(preview.warnings||[]).length>0&&<div className="notice"><strong>Source/parser notes</strong><ul>{(preview.warnings||[]).map((w,i)=><li key={i}>{w}</li>)}</ul></div>}
      {reviewCounts.serverMismatch&&<div className="notice" role="status"><strong>Review summary synchronized.</strong> OPSIQO is using the authoritative row validation state for the counts and import gate.</div>}
      {reviewCounts.blockedCount>0&&<div className="notice"><strong>OPSIQO found information that needs your confirmation.</strong> Complete the highlighted rows below. You do not need to edit and upload the source file again.</div>}

      <div className="tableWrap"><table>
        <thead><tr><th>Row</th><th>Employee</th><th>Email / number</th><th>Manager</th><th>Hire date</th><th>Result</th></tr></thead>
        <tbody>{preview.rows.map(r=><FragmentRow key={r.rowNumber} row={r} preview={preview} editingRow={editingRow} draft={draft} setDraft={setDraft} beginEdit={beginEdit} saveCorrection={saveCorrection} cancelEdit={()=>setEditingRow(null)} busy={busy} availablePositions={availablePositions}/>)}</tbody>
      </table></div>

      <button className="button" disabled={reviewCounts.blockedCount>0||busy==='commit'} onClick={commit}>{busy==='commit'?'Creating employees…':reviewCounts.blockedCount?`Complete ${reviewCounts.blockedCount} row(s) before import`:`Import ${reviewCounts.readyCount} reviewed employee(s)`}</button>
      {reviewCounts.blockedCount>0&&<div className="muted">Rows automatically move to Ready after the server confirms that all required information is valid.</div>}
    </div>}
  </section>;
}

function FragmentRow({row,preview,editingRow,draft,setDraft,beginEdit,saveCorrection,cancelEdit,busy,availablePositions}:{
  row:PreviewRow;
  preview:Preview;
  editingRow:number|null;
  draft:EditDraft;
  setDraft:(next:EditDraft)=>void;
  beginEdit:(row:PreviewRow)=>void;
  saveCorrection:()=>Promise<void>;
  cancelEdit:()=>void;
  busy:string;
  availablePositions:PreviewOptions['positions'];
}){
  const editing=editingRow===row.rowNumber;
  return <>
    <tr>
      <td>{row.rowNumber}</td>
      <td><strong>{row.legalFirstName} {row.legalLastName}</strong>{(row.orgUnitSource||row.positionSource)&&<div className="muted">Source: {[row.orgUnitSource,row.positionSource].filter(Boolean).join(' · ')}</div>}</td>
      <td>{row.workEmail||'—'}<div className="muted">{row.employeeNumber||'Auto-assigned'}</div></td>
      <td>{row.managerWorkerId?'Manager selected':row.managerReference?<>{row.managerReference}<div className="muted">{row.managerRowNumber?`Import row ${row.managerRowNumber}`:'Needs resolution'}</div></>:'—'}</td>
      <td>{row.hireDate||'—'}</td>
      <td>{row.errors.length?<div className="stack"><div className="error compactError">{row.errors.map((message,index)=><div key={`${row.rowNumber}-error-${index}`}>{message}</div>)}</div><button type="button" className="button secondary" onClick={()=>beginEdit(row)}>Complete information</button></div>:<div className="row wrap"><span className="badge">Ready</span><button type="button" className="button secondary" onClick={()=>beginEdit(row)}>Review / edit</button></div>}</td>
    </tr>
    {editing&&<tr><td colSpan={6}>
      <div className="card stack">
        <div className="toolbar"><div><strong>Complete employee information · Row {row.rowNumber}</strong><div className="muted">Parsed values are prefilled. Add or correct what is needed, then save. OPSIQO will revalidate the entire preview.</div></div><button type="button" className="button secondary" onClick={cancelEdit}>Close</button></div>
        <div className="grid2">
          <label className="field"><span>First name</span><input className="input" value={draft.legalFirstName} onChange={e=>setDraft({...draft,legalFirstName:e.target.value})}/></label>
          <label className="field"><span>Last / family name</span><input className="input" value={draft.legalLastName} onChange={e=>setDraft({...draft,legalLastName:e.target.value})}/></label>
          <label className="field"><span>Work email <span className="muted">(optional)</span></span><input className="input" type="email" value={draft.workEmail} onChange={e=>setDraft({...draft,workEmail:e.target.value})}/></label>
          <label className="field"><span>Employee number <span className="muted">(optional — auto-assigned if blank)</span></span><input className="input" value={draft.employeeNumber} onChange={e=>setDraft({...draft,employeeNumber:e.target.value})}/></label>
          <label className="field"><span>Phone <span className="muted">(optional)</span></span><input className="input" value={draft.phone} onChange={e=>setDraft({...draft,phone:e.target.value})}/></label>
          <label className="field"><span>Employment type</span><select className="input" value={draft.employmentType} onChange={e=>setDraft({...draft,employmentType:e.target.value})}><option value="permanent">Permanent</option><option value="temporary">Temporary</option><option value="contractor">Contractor</option><option value="intern">Intern</option><option value="volunteer">Volunteer</option></select></label>
          <label className="field"><span>Hire date</span><input className="input" type="date" value={draft.hireDate} onChange={e=>setDraft({...draft,hireDate:e.target.value})}/></label>
          <label className="field"><span>Organization unit</span><select className="input" value={draft.orgUnitId} onChange={e=>setDraft({...draft,orgUnitId:e.target.value,positionId:''})}><option value="">No organization unit / select unit</option>{preview.options.orgUnits.map(u=><option key={u.id} value={u.id}>{u.name}{u.code?` · ${u.code}`:''}</option>)}</select>{row.orgUnitSource&&<span className="muted">Parsed from source: {row.orgUnitSource}</span>}</label>
          <label className="field"><span>Position</span><select className="input" value={draft.positionId} disabled={!draft.orgUnitId} onChange={e=>setDraft({...draft,positionId:e.target.value})}><option value="">No position / select available position</option>{availablePositions.map(p=><option key={p.id} value={p.id}>{p.title} · {p.availableHeadcount} seat(s)</option>)}</select>{row.positionSource&&<span className="muted">Parsed from source: {row.positionSource}</span>}</label>
          <label className="field"><span>Manager <span className="muted">(optional)</span></span><select className="input" value={draft.managerWorkerId} onChange={e=>setDraft({...draft,managerWorkerId:e.target.value})}><option value="">No manager</option>{preview.options.managers.map(m=><option key={m.id} value={m.id}>{m.displayName}{m.employeeNumber?` · ${m.employeeNumber}`:''}</option>)}</select>{row.managerReference&&<span className="muted">Parsed from source: {row.managerReference}</span>}</label>
        </div>
        <div className="row wrap"><button type="button" className="button" disabled={busy===`row-${row.rowNumber}`} onClick={()=>void saveCorrection()}>{busy===`row-${row.rowNumber}`?'Saving & revalidating…':'Save & revalidate'}</button><button type="button" className="button secondary" onClick={cancelEdit}>Cancel</button></div>
      </div>
    </td></tr>}
  </>;
}
