'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { OpsiqoSelect } from '@/components/opsiqo-select';
import { apiFetch, setActiveOrgId, tryActiveOrgId } from '@/lib/http/client';
import type { ActorContext } from '@/domain/security';
import type { PlatformTenantSummary, PlatformTenantDeletionInspection } from '@/lib/platform/tenant-management';

type Me={actor:ActorContext};
type Created={orgId:string;organization:{name:string;environment:string}};
type ManageMode='deactivate'|'reactivate'|'delete';

export function PlatformTenantWorkspace(){
  const[me,setMe]=useState<Me|null>(null);
  const[rows,setRows]=useState<PlatformTenantSummary[]>([]);
  const[error,setError]=useState('');
  const[notice,setNotice]=useState('');
  const[busy,setBusy]=useState(false);
  const[environment,setEnvironment]=useState('test');
  const[manageRow,setManageRow]=useState<PlatformTenantSummary|null>(null);
  const[manageMode,setManageMode]=useState<ManageMode|null>(null);
  const[reason,setReason]=useState('');
  const[confirmName,setConfirmName]=useState('');
  const[productionConfirmation,setProductionConfirmation]=useState('');
  const[inspection,setInspection]=useState<PlatformTenantDeletionInspection|null>(null);
  const[actionBusy,setActionBusy]=useState(false);
  const currentOrgId=typeof window==='undefined'?null:tryActiveOrgId();

  const load=async()=>{
    try{
      setError('');
      const m=await apiFetch<Me>('/api/me');
      setMe(m);
      if(m.actor.role!=='super_admin')return;
      setRows((await apiFetch<{data:PlatformTenantSummary[]}>('/api/platform/tenants')).data);
    }catch(e){
      setError(e instanceof Error?e.message:'Unable to load platform tenants.');
    }
  };

  useEffect(()=>{load()},[]);

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    const formElement=e.currentTarget;
    const form=new FormData(formElement);
    try{
      const result=await apiFetch<{data:Created}>('/api/platform/tenants',{
        method:'POST',
        body:JSON.stringify({
          organizationName:form.get('organizationName'),
          administratorFirstName:form.get('administratorFirstName'),
          administratorLastName:form.get('administratorLastName'),
          environment:form.get('environment'),
          reason:form.get('reason'),
        }),
      });
      setNotice(`${result.data.organization.name} was created successfully. You now have governed super-admin access to the new tenant.`);
      formElement.reset();
      setEnvironment('test');
      await load();
    }catch(err){
      setError(err instanceof Error?err.message:'Tenant creation failed.');
    }finally{
      setBusy(false);
    }
  }

  function resetManage(){
    setManageRow(null);
    setManageMode(null);
    setReason('');
    setConfirmName('');
    setProductionConfirmation('');
    setInspection(null);
  }

  async function openManage(row:PlatformTenantSummary,mode:ManageMode){
    setError('');
    setNotice('');
    setManageRow(row);
    setManageMode(mode);
    setReason('');
    setConfirmName('');
    setProductionConfirmation('');
    setInspection(null);
    if(mode==='delete'){
      try{
        setActionBusy(true);
        const response=await apiFetch<{data:PlatformTenantDeletionInspection}>(`/api/platform/tenants/${encodeURIComponent(row.id)}`);
        setInspection(response.data);
      }catch(err){
        setError(err instanceof Error?err.message:'Unable to inspect organization dependencies.');
      }finally{
        setActionBusy(false);
      }
    }
  }

  async function applyLifecycle(){
    if(!manageRow||!manageMode||manageMode==='delete')return;
    setActionBusy(true);
    setError('');
    setNotice('');
    try{
      const response=await apiFetch<{data:{organization:{name:string;status:string}}}>(`/api/platform/tenants/${encodeURIComponent(manageRow.id)}`,{
        method:'PATCH',
        body:JSON.stringify({action:manageMode,reason}),
      });
      setNotice(`${response.data.organization.name} is now ${response.data.organization.status}.`);
      resetManage();
      await load();
    }catch(err){
      setError(err instanceof Error?err.message:'Organization lifecycle update failed.');
    }finally{
      setActionBusy(false);
    }
  }

  async function deleteTenant(){
    if(!manageRow||manageMode!=='delete')return;
    setActionBusy(true);
    setError('');
    setNotice('');
    try{
      const response=await apiFetch<{data:{organizationName:string;orgId:string;deletedAt:string}}>(`/api/platform/tenants/${encodeURIComponent(manageRow.id)}`,{
        method:'DELETE',
        body:JSON.stringify({
          organizationName:confirmName,
          reason,
          productionConfirmation,
        }),
      });
      setNotice(`${response.data.organizationName} was permanently deleted. Platform deletion evidence was retained.`);
      resetManage();
      await load();
    }catch(err){
      setError(err instanceof Error?err.message:'Permanent organization deletion failed.');
    }finally{
      setActionBusy(false);
    }
  }

  const manageIsCurrent=Boolean(manageRow&&manageRow.id===currentOrgId);
  const canConfirmLifecycle=reason.trim().length>=10&&!manageIsCurrent;
  const canDelete=Boolean(
    manageRow&&
    inspection?.canDelete&&
    confirmName===manageRow.name&&
    reason.trim().length>=10&&
    (manageRow.environment!=='production'||productionConfirmation==='DELETE PRODUCTION')
  );

  const dependencyPreview=useMemo(()=>inspection?.dependencies.collections.slice(0,12)||[],[inspection]);

  if(me&&me.actor.role!=='super_admin'){
    return <div className="error">This screen is restricted to platform super-administrators.</div>;
  }

  return <div className="stack">
    {error&&<div className="error" role="alert">{error}</div>}
    {notice&&<div className="success" role="status">{notice}</div>}

    <div className="grid2">
      <form className="card stack" onSubmit={submit}>
        <div>
          <span className="eyebrow">Governed platform administration</span>
          <h2 className="sectionTitle">Create a separate company</h2>
          <p className="muted">Creates an isolated tenant and its administrator foundation. No data is copied from the current organization.</p>
        </div>
        <label className="field"><span>Company name</span><input className="input" name="organizationName" required minLength={2} maxLength={120}/></label>
        <div className="formGrid">
          <label className="field"><span>Administrator first name</span><input className="input" name="administratorFirstName" required maxLength={80}/></label>
          <label className="field"><span>Administrator last name</span><input className="input" name="administratorLastName" required maxLength={80}/></label>
        </div>
        <label className="field">
          <span>Environment</span>
          <input type="hidden" name="environment" value={environment}/>
          <OpsiqoSelect ariaLabel="Environment" value={environment} onChange={setEnvironment} options={[
            {value:'test',label:'Test'},
            {value:'uat',label:'UAT'},
            {value:'production',label:'Production'},
          ]}/>
        </label>
        <label className="field"><span>Creation reason</span><textarea className="input" name="reason" required minLength={10} maxLength={500} defaultValue="Create an isolated company for governed platform testing and user acceptance."/></label>
        <button className="button" disabled={busy}>{busy?'Creating tenant…':'Create company securely'}</button>
      </form>

      <section className="card stack">
        <h2 className="sectionTitle">Tenant-creation controls</h2>
        <div className="securityChecklist">
          <div>✓ Super-admin role required</div>
          <div>✓ Verified administrator identity required</div>
          <div>✓ Duplicate company-name protection</div>
          <div>✓ Transactional organization foundation</div>
          <div>✓ Separate worker and membership records</div>
          <div>✓ Immutable audit evidence</div>
          <div>✓ No cross-tenant data copying</div>
        </div>
      </section>
    </div>

    <section className="card tableWrap">
      <div className="rowBetween">
        <div>
          <span className="eyebrow">Platform administration</span>
          <h2 className="sectionTitle">Platform companies</h2>
          <p className="muted">Deactivate before permanent deletion. The organization you are currently operating from is protected.</p>
        </div>
      </div>
      <table>
        <thead><tr><th>Company</th><th>Environment</th><th>Status</th><th>Created</th><th>Action</th></tr></thead>
        <tbody>
          {rows.map(row=>{
            const isCurrent=row.id===currentOrgId;
            const active=row.status==='active';
            return <tr key={row.id}>
              <td><strong>{row.name}</strong><div className="muted">{row.id}</div>{isCurrent?<div className="muted">Current organization</div>:null}</td>
              <td>{row.environment}</td>
              <td><span className="badge">{row.status}</span></td>
              <td>{row.createdAt?new Date(row.createdAt).toLocaleString():'—'}</td>
              <td>
                <div className="row" style={{gap:8,flexWrap:'wrap'}}>
                  <button className="button secondary compact" onClick={()=>{setActiveOrgId(row.id);window.location.assign('/dashboard')}} disabled={!active}>Open company</button>
                  {active
                    ?<button className="button secondary compact" onClick={()=>openManage(row,'deactivate')} disabled={isCurrent}>Deactivate</button>
                    :<button className="button secondary compact" onClick={()=>openManage(row,'reactivate')} disabled={isCurrent}>Reactivate</button>}
                  {!active?<button className="button secondary compact" onClick={()=>openManage(row,'delete')} disabled={isCurrent}>Permanently delete</button>:null}
                </div>
              </td>
            </tr>;
          })}
          {!rows.length&&<tr><td colSpan={5} className="muted">No platform companies are visible.</td></tr>}
        </tbody>
      </table>
    </section>

    {manageRow&&manageMode?<section className="card stack" aria-live="polite">
      <div className="rowBetween">
        <div>
          <span className="eyebrow">Governed organization lifecycle</span>
          <h2 className="sectionTitle">
            {manageMode==='delete'?'Permanently delete':manageMode==='deactivate'?'Deactivate':'Reactivate'} {manageRow.name}
          </h2>
        </div>
        <button className="button secondary compact" onClick={resetManage} disabled={actionBusy}>Cancel</button>
      </div>

      {manageIsCurrent?<div className="error">The currently active organization cannot be deactivated or deleted. Switch to another active organization first.</div>:null}

      {manageMode==='delete'?<>
        <div className="notice">
          <strong>Permanent means permanent.</strong> The organization must already be inactive. OPSIQO will recursively delete its Firestore tenant document and subcollections, release its company-name reservation, and retain separate platform deletion evidence.
        </div>
        {actionBusy&&!inspection?<div className="muted">Scanning organization dependencies…</div>:null}
        {inspection?<div className="stack">
          <div className="grid3">
            <div className="metric"><strong>{inspection.dependencies.collectionCount}</strong><span>tenant collections</span></div>
            <div className="metric"><strong>{inspection.dependencies.documentCount}</strong><span>top-level tenant documents</span></div>
            <div className="metric"><strong>{inspection.environment}</strong><span>environment</span></div>
          </div>
          {dependencyPreview.length?<div className="notice">
            <strong>Dependency scan:</strong> {dependencyPreview.map(item=>`${item.collection} (${item.documents})`).join(', ')}
            {inspection.dependencies.collections.length>dependencyPreview.length?' …':''}
          </div>:null}
        </div>:null}

        <label className="field">
          <span>Deletion reason</span>
          <textarea className="input" value={reason} onChange={e=>setReason(e.target.value)} minLength={10} maxLength={500} placeholder="Explain why this organization must be permanently deleted."/>
        </label>
        <label className="field">
          <span>Type the exact organization name to confirm</span>
          <input className="input" value={confirmName} onChange={e=>setConfirmName(e.target.value)} placeholder={manageRow.name}/>
        </label>
        {manageRow.environment==='production'?<label className="field">
          <span>Production safeguard — type DELETE PRODUCTION</span>
          <input className="input" value={productionConfirmation} onChange={e=>setProductionConfirmation(e.target.value)} placeholder="DELETE PRODUCTION"/>
        </label>:null}
        <button className="button" onClick={deleteTenant} disabled={actionBusy||!canDelete}>
          {actionBusy?'Deleting organization…':'Permanently delete organization'}
        </button>
      </>:<>
        <div className="notice">
          {manageMode==='deactivate'
            ?'Deactivation blocks organization access while preserving all tenant data for later reactivation or governed deletion.'
            :'Reactivation restores organization access without recreating tenant data.'}
        </div>
        <label className="field">
          <span>{manageMode==='deactivate'?'Deactivation':'Reactivation'} reason</span>
          <textarea className="input" value={reason} onChange={e=>setReason(e.target.value)} minLength={10} maxLength={500}/>
        </label>
        <button className="button" onClick={applyLifecycle} disabled={actionBusy||!canConfirmLifecycle}>
          {actionBusy?'Applying change…':manageMode==='deactivate'?'Deactivate organization':'Reactivate organization'}
        </button>
      </>}
    </section>:null}
  </div>;
}
