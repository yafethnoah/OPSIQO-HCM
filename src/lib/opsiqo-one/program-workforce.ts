import { randomUUID } from 'crypto';
import { z } from 'zod';
import type { ActorContext } from '@/domain/security';
import type { Assignment,Employment,OrgUnit,Position,Worker } from '@/domain/hr';
import type { GrantFundingSource,GrantWorkforceAllocation } from '@/domain/opsiqo-one-v7-15';
import type { ProgramProject,ProgramWorkforceDashboard,ProgramWorkforceRow } from '@/domain/opsiqo-one-v7-16';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';

const now=()=>new Date().toISOString();
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const projectSchema=z.object({
  code:z.string().trim().min(2).max(50),
  name:z.string().trim().min(3).max(200),
  fundingSourceId:z.string().min(1),
  orgUnitId:z.string().optional(),
  startDate:date,
  endDate:date,
  status:z.enum(['planned','active','closed']).default('active'),
  notes:z.string().trim().max(2000).optional(),
}).refine(v=>v.endDate>=v.startDate,{message:'Project end date must be on or after start date.'});

function requireRead(actor:ActorContext){if(!actor.permissions.includes('workforce.read'))throw new ApiError(403,'Workforce planning permission required.','forbidden')}
function requireManage(actor:ActorContext){if(!actor.permissions.includes('workforce.manage'))throw new ApiError(403,'Workforce management permission required.','forbidden')}
function activeOn<T extends {startDate:string;endDate?:string}>(row:T,today:string){return row.startDate<=today&&(!row.endDate||row.endDate>=today)}

export async function programWorkforceDashboard(actor:ActorContext):Promise<ProgramWorkforceDashboard>{
  requireRead(actor);
  const db=adminDb();
  const [projectSnap,sourceSnap,allocationSnap,workerSnap,employmentSnap,assignmentSnap,positionSnap,orgUnitSnap]=await Promise.all([
    db.collection(`organizations/${actor.orgId}/grantProjects`).limit(1000).get(),
    db.collection(`organizations/${actor.orgId}/grantFundingSources`).limit(1000).get(),
    db.collection(`organizations/${actor.orgId}/grantWorkforceAllocations`).limit(5000).get(),
    db.collection(`organizations/${actor.orgId}/workers`).limit(5000).get(),
    db.collection(`organizations/${actor.orgId}/employments`).limit(5000).get(),
    db.collection(`organizations/${actor.orgId}/assignments`).limit(10000).get(),
    db.collection(`organizations/${actor.orgId}/positions`).limit(5000).get(),
    db.collection(`organizations/${actor.orgId}/orgUnits`).limit(5000).get(),
  ]);
  const projects=projectSnap.docs.map(d=>d.data() as ProgramProject);
  const sources=sourceSnap.docs.map(d=>d.data() as GrantFundingSource);
  const allocations=allocationSnap.docs.map(d=>d.data() as GrantWorkforceAllocation);
  const workers=new Map<string,Worker>(workerSnap.docs.map(d=>{const x=d.data() as Worker;return[x.id,x] as [string,Worker]}));
  const employments=employmentSnap.docs.map(d=>d.data() as Employment);
  const assignments=assignmentSnap.docs.map(d=>d.data() as Assignment);
  const positions=new Map<string,Position>(positionSnap.docs.map(d=>{const x=d.data() as Position;return[x.id,x] as [string,Position]}));
  const orgUnits=new Map<string,OrgUnit>(orgUnitSnap.docs.map(d=>{const x=d.data() as OrgUnit;return[x.id,x] as [string,OrgUnit]}));
  const projectMap=new Map<string,ProgramProject>(projects.map(x=>[x.id,x] as [string,ProgramProject]));
  const sourceMap=new Map<string,GrantFundingSource>(sources.map(x=>[x.id,x] as [string,GrantFundingSource]));
  const today=new Date().toISOString().slice(0,10);
  const currentAssignments=assignments.filter(x=>activeOn(x,today));
  const primaryByWorker=new Map<string,Assignment>();
  for(const a of currentAssignments){if(a.primary||a.assignmentType==='primary'||!primaryByWorker.has(a.workerId))primaryByWorker.set(a.workerId,a)}
  const currentEmployment=new Map<string,Employment>(employments.filter(x=>x.status==='active'&&activeOn(x,today)).map(x=>[x.workerId,x] as [string,Employment]));
  const rows:ProgramWorkforceRow[]=allocations.map(a=>{
    const w=workers.get(a.workerId),assignment=primaryByWorker.get(a.workerId),position=assignment?positions.get(assignment.positionId):undefined,unit=assignment?orgUnits.get(assignment.orgUnitId):undefined,source=sourceMap.get(a.fundingSourceId),project=a.projectId?projectMap.get(a.projectId):undefined,employment=currentEmployment.get(a.workerId);
    return{allocationId:a.id,projectId:project?.id,projectCode:project?.code||'UNASSIGNED',projectName:project?.name||'Unassigned project',fundingSourceId:a.fundingSourceId,fundingCode:source?.code||'UNKNOWN',fundingName:source?.name||'Unknown funding source',workerId:a.workerId,workerName:w?.displayName||'Unknown worker',employmentType:employment?.employmentType,positionId:position?.id,positionTitle:position?.title,orgUnitId:unit?.id,orgUnitName:unit?.name,allocationPct:a.allocationPct,plannedAnnualAmount:typeof a.plannedAnnualAmount==='number'?a.plannedAnnualAmount:null,currency:source?.currency||'—',startDate:a.startDate,endDate:a.endDate};
  });
  const currentRows=rows.filter(r=>activeOn(r,today));
  const explicit=currentRows.filter(r=>r.plannedAnnualAmount!==null);
  const cost=explicit.length?explicit.reduce((n,r)=>n+(r.plannedAnnualAmount||0),0):null;
  const signals:ProgramWorkforceDashboard['signals']=[];
  const unassigned=currentRows.filter(r=>!r.projectId);
  if(unassigned.length)signals.push({id:'program-unassigned',severity:'medium',title:'Funding allocations are not linked to a project',summary:`${unassigned.length} active allocation(s) have a funding source but no explicit project link.`,href:'/program-workforce'});
  const uncosted=currentRows.filter(r=>r.plannedAnnualAmount===null);
  if(uncosted.length)signals.push({id:'program-uncosted',severity:'info',title:'Program cost evidence is incomplete',summary:`${uncosted.length} active allocation(s) do not have an explicit planned annual funded amount. OPSIQO will not infer salary cost from restricted compensation records.`,href:'/program-workforce'});
  const noPosition=currentRows.filter(r=>!r.positionId);
  if(noPosition.length)signals.push({id:'program-position-gap',severity:'medium',title:'Position linkage is incomplete',summary:`${noPosition.length} active funded allocation(s) do not resolve to a current position assignment.`,href:'/program-workforce'});
  return{projects:projects.sort((a,b)=>a.code.localeCompare(b.code)),rows:rows.sort((a,b)=>a.projectName.localeCompare(b.projectName)||a.workerName.localeCompare(b.workerName)),metrics:{activeProjects:projects.filter(p=>p.status==='active'&&p.startDate<=today&&p.endDate>=today).length,activeFundingSources:sources.filter(s=>s.status==='active'&&s.startDate<=today&&s.endDate>=today).length,fundedWorkers:new Set(currentRows.map(r=>r.workerId)).size,linkedPositions:new Set(currentRows.map(r=>r.positionId).filter(Boolean)).size,explicitPlannedAnnualCost:cost,uncostedAllocations:uncosted.length},signals,generatedAt:now(),methodologyNotice:'Program Workforce Intelligence connects only explicit Project → Funding → Allocation → Worker → current Position evidence. Cost uses the human-entered planned annual funded amount on the allocation. OPSIQO does not infer compensation, donor compliance, legal eligibility, future funding, termination need, or individual employment outcomes.'};
}

export async function createProgramProject(actor:ActorContext,raw:unknown){
  requireManage(actor);const input=projectSchema.parse(raw),db=adminDb();
  const [fundingSnap,dup,unitSnap]=await Promise.all([
    db.doc(`organizations/${actor.orgId}/grantFundingSources/${input.fundingSourceId}`).get(),
    db.collection(`organizations/${actor.orgId}/grantProjects`).where('code','==',input.code).limit(1).get(),
    input.orgUnitId?db.doc(`organizations/${actor.orgId}/orgUnits/${input.orgUnitId}`).get():Promise.resolve(null),
  ]);
  if(!fundingSnap.exists)throw new ApiError(404,'Funding source not found.','grant_source_not_found');
  if(!dup.empty)throw new ApiError(409,'Project code already exists.','grant_project_code_exists');
  if(unitSnap&&!unitSnap.exists)throw new ApiError(404,'Organization unit not found.','org_unit_not_found');
  const funding=fundingSnap.data() as GrantFundingSource;
  if(funding.status==='closed')throw new ApiError(409,'Closed funding sources cannot receive new program projects.','grant_source_closed');
  if(input.startDate<funding.startDate||input.endDate>funding.endDate)throw new ApiError(409,'Project period must remain within the funding source period.','grant_project_outside_funding_period');
  const id=randomUUID(),timestamp=now();
  const row:ProgramProject={id,...input,createdBy:actor.uid,createdAt:timestamp,updatedBy:actor.uid,updatedAt:timestamp};
  const audit=buildAudit(actor,{action:'workforce.grant_project.create',entityType:'grantProject',entityId:id,after:row});
  const batch=db.batch();batch.create(db.doc(`organizations/${actor.orgId}/grantProjects/${id}`),row);batch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);await batch.commit();return row;
}
