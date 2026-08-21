import { randomUUID } from 'crypto';
import { z } from 'zod';
import type { ActorContext } from '@/domain/security';
import type { GrantFundingSource,GrantWorkforceAllocation } from '@/domain/opsiqo-one-v7-15';
import type { ProgramProject } from '@/domain/opsiqo-one-v7-16';
import type { ProgramFinancialEvidence,ProgramPortfolioDashboard,ProgramPortfolioRow } from '@/domain/opsiqo-one-v7-17';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';

const now=()=>new Date().toISOString();
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const evidenceSchema=z.object({
  projectId:z.string().min(1),
  fundingSourceId:z.string().min(1),
  kind:z.enum(['approved_budget','actual','commitment','forecast']),
  amount:z.number().finite().nonnegative().max(1e15),
  currency:z.string().trim().min(3).max(8).transform(v=>v.toUpperCase()),
  evidenceDate:date,
  sourceType:z.enum(['finance_export','ledger_extract','approved_budget','invoice_batch','manual_verified']),
  sourceReference:z.string().trim().min(2).max(300),
  note:z.string().trim().max(2000).optional(),
});
function requireRead(a:ActorContext){if(!a.permissions.includes('workforce.read'))throw new ApiError(403,'Workforce planning permission required.','forbidden')}
function requireManage(a:ActorContext){if(!a.permissions.includes('workforce.manage'))throw new ApiError(403,'Workforce management permission required.','forbidden')}
function latest(rows:ProgramFinancialEvidence[],kind:ProgramFinancialEvidence['kind']){return rows.filter(x=>x.kind===kind).sort((a,b)=>`${b.evidenceDate}:${b.createdAt}`.localeCompare(`${a.evidenceDate}:${a.createdAt}`))[0]}
function sum(rows:ProgramFinancialEvidence[],kind:ProgramFinancialEvidence['kind']){const matches=rows.filter(x=>x.kind===kind);return matches.length?matches.reduce((n,x)=>n+x.amount,0):null}
function money(n:number){return Math.round(n*100)/100}

export async function programPortfolioDashboard(a:ActorContext):Promise<ProgramPortfolioDashboard>{
  requireRead(a);const db=adminDb();
  const [projectsSnap,sourcesSnap,allocationsSnap,evidenceSnap]=await Promise.all([
    db.collection(`organizations/${a.orgId}/grantProjects`).limit(1000).get(),
    db.collection(`organizations/${a.orgId}/grantFundingSources`).limit(1000).get(),
    db.collection(`organizations/${a.orgId}/grantWorkforceAllocations`).limit(5000).get(),
    db.collection(`organizations/${a.orgId}/programFinancialEvidence`).orderBy('evidenceDate','desc').limit(10000).get(),
  ]);
  const projects=projectsSnap.docs.map(d=>d.data() as ProgramProject),sources=sourcesSnap.docs.map(d=>d.data() as GrantFundingSource),allocations=allocationsSnap.docs.map(d=>d.data() as GrantWorkforceAllocation),evidence=evidenceSnap.docs.map(d=>d.data() as ProgramFinancialEvidence);
  const sourceMap=new Map(sources.map(x=>[x.id,x] as const));
  const rows:ProgramPortfolioRow[]=projects.map(project=>{
    const source=sourceMap.get(project.fundingSourceId),projectAllocations=allocations.filter(x=>x.projectId===project.id&&x.fundingSourceId===project.fundingSourceId),projectEvidence=evidence.filter(x=>x.projectId===project.id&&x.fundingSourceId===project.fundingSourceId),budget=latest(projectEvidence,'approved_budget')?.amount??null,actual=sum(projectEvidence,'actual'),commitment=sum(projectEvidence,'commitment'),forecast=latest(projectEvidence,'forecast')?.amount??null,plannedRows=projectAllocations.filter(x=>typeof x.plannedAnnualAmount==='number'),planned=plannedRows.length?money(plannedRows.reduce((n,x)=>n+Number(x.plannedAnnualAmount||0),0)):null,spent=money((actual||0)+(commitment||0)),variance=budget===null?null:money(budget-spent),utilization=budget&&budget>0?money((spent/budget)*100):null,state:ProgramPortfolioRow['evidenceState']=budget!==null&&actual!==null?'complete':projectEvidence.length?'partial':'not_configured';
    return{projectId:project.id,projectCode:project.code,projectName:project.name,fundingSourceId:project.fundingSourceId,fundingCode:source?.code||'UNKNOWN',fundingName:source?.name||'Unknown funding source',currency:source?.currency||projectEvidence[0]?.currency||'—',workerCount:new Set(projectAllocations.map(x=>x.workerId)).size,allocationCount:projectAllocations.length,plannedWorkforceAmount:planned,approvedBudget:budget,actual,commitment,forecast,budgetVariance:variance,budgetUtilizationPct:utilization,evidenceCount:projectEvidence.length,evidenceFreshThrough:projectEvidence.map(x=>x.evidenceDate).sort().at(-1),evidenceState:state};
  }).sort((x,y)=>x.projectCode.localeCompare(y.projectCode));
  const currencySummaries=[...new Set(rows.map(r=>r.currency).filter(x=>x&&x!=='—'))].sort().map(currency=>{const group=rows.filter(r=>r.currency===currency);const aggregate=(key:'approvedBudget'|'actual'|'commitment'|'forecast'|'plannedWorkforceAmount')=>{const values=group.map(r=>r[key]).filter((v):v is number=>typeof v==='number');return values.length?money(values.reduce((n,v)=>n+v,0)):null};return{currency,approvedBudget:aggregate('approvedBudget'),actual:aggregate('actual'),commitment:aggregate('commitment'),forecast:aggregate('forecast'),plannedWorkforceAmount:aggregate('plannedWorkforceAmount'),projectCount:group.length}});
  const signals:ProgramPortfolioDashboard['signals']=[];
  const noFinancial=rows.filter(r=>r.evidenceState==='not_configured');if(noFinancial.length)signals.push({id:'portfolio-financial-evidence-missing',severity:'medium',title:'Program financial evidence is not configured',summary:`${noFinancial.length} project(s) have no approved-budget, actual, commitment or forecast evidence. OPSIQO will not infer finance actuals from HR or compensation records.`,href:'/program-portfolio'});
  const noActual=rows.filter(r=>r.approvedBudget!==null&&r.actual===null);if(noActual.length)signals.push({id:'portfolio-actual-missing',severity:'info',title:'Actual evidence is missing for budgeted projects',summary:`${noActual.length} project(s) have approved-budget evidence but no recorded actual evidence.`,href:'/program-portfolio'});
  const overBudget=rows.filter(r=>r.budgetVariance!==null&&r.budgetVariance<0);if(overBudget.length)signals.push({id:'portfolio-budget-variance',severity:'high',title:'Recorded spend and commitments exceed recorded budget',summary:`${overBudget.length} project(s) have a negative balance against the latest approved-budget evidence. This is an operational evidence signal, not an accounting conclusion.`,href:'/program-portfolio'});
  return{rows,currencySummaries,evidence:evidence.sort((x,y)=>`${y.evidenceDate}:${y.createdAt}`.localeCompare(`${x.evidenceDate}:${x.createdAt}`)).slice(0,500),metrics:{projects:rows.length,projectsWithBudgetEvidence:rows.filter(r=>r.approvedBudget!==null).length,projectsWithActualEvidence:rows.filter(r=>r.actual!==null).length,projectsWithCompleteEvidence:rows.filter(r=>r.evidenceState==='complete').length,projectsMissingFinancialEvidence:noFinancial.length},signals,generatedAt:now(),methodologyNotice:'Program Portfolio uses only explicit program financial evidence recorded with a source reference. Approved budget and forecast are treated as latest snapshots; actual and commitment evidence are additive entries. Currency totals are never combined across currencies. OPSIQO does not infer accounting actuals, payroll actuals, donor allowability, legal compliance, audited financial statements or future funding.'};
}

export async function recordProgramFinancialEvidence(a:ActorContext,raw:unknown):Promise<ProgramFinancialEvidence>{
  requireManage(a);const input=evidenceSchema.parse(raw),db=adminDb();
  const [projectSnap,sourceSnap]=await Promise.all([db.doc(`organizations/${a.orgId}/grantProjects/${input.projectId}`).get(),db.doc(`organizations/${a.orgId}/grantFundingSources/${input.fundingSourceId}`).get()]);
  if(!projectSnap.exists)throw new ApiError(404,'Program project not found.','grant_project_not_found');if(!sourceSnap.exists)throw new ApiError(404,'Funding source not found.','grant_source_not_found');
  const project=projectSnap.data() as ProgramProject,source=sourceSnap.data() as GrantFundingSource;
  if(project.fundingSourceId!==input.fundingSourceId)throw new ApiError(409,'Financial evidence funding source must match the project funding source.','program_financial_funding_mismatch');
  if(input.evidenceDate<project.startDate||input.evidenceDate>project.endDate)throw new ApiError(409,'Financial evidence date must fall inside the project period.','program_financial_outside_project_period');
  if(input.currency!==source.currency.toUpperCase())throw new ApiError(409,'Financial evidence currency must match the project funding currency.','program_financial_currency_mismatch');
  const id=randomUUID(),createdAt=now(),row:ProgramFinancialEvidence={id,...input,createdBy:a.uid,createdAt},audit=buildAudit(a,{action:'workforce.program_financial_evidence.record',entityType:'programFinancialEvidence',entityId:id,after:{...row,sourceReference:'[financial evidence reference recorded]'}}),batch=db.batch();
  batch.create(db.doc(`organizations/${a.orgId}/programFinancialEvidence/${id}`),row);batch.create(db.doc(`organizations/${a.orgId}/auditLogs/${audit.id}`),audit);await batch.commit();return row;
}



export function programPortfolioCsvCell(value:unknown){
  let text=value===null||value===undefined?'':String(value);
  if(/^[=+\-@]/.test(text))text=`'${text}`;
  return `"${text.replaceAll('"','""')}"`;
}
export function buildProgramPortfolioEvidencePack(dashboard:ProgramPortfolioDashboard,organizationId:string){
  return{schemaVersion:'OPSIQO_ONE_V7_19_PROGRAM_PORTFOLIO_EXPORT',organizationId,generatedAt:dashboard.generatedAt,methodologyNotice:dashboard.methodologyNotice,currencySummaries:dashboard.currencySummaries,portfolioRows:dashboard.rows,evidence:dashboard.evidence.map(row=>({...row,sourceReference:row.sourceReference}))};
}
export function buildProgramPortfolioCsv(dashboard:ProgramPortfolioDashboard){
  const headers=['Project code','Project name','Funding code','Funding name','Currency','Workers','Allocations','Planned workforce','Approved budget','Actual','Commitment','Forecast','Balance','Utilization pct','Evidence state','Evidence fresh through'];
  const lines=[headers.map(programPortfolioCsvCell).join(',')];
  for(const row of dashboard.rows)lines.push([row.projectCode,row.projectName,row.fundingCode,row.fundingName,row.currency,row.workerCount,row.allocationCount,row.plannedWorkforceAmount,row.approvedBudget,row.actual,row.commitment,row.forecast,row.budgetVariance,row.budgetUtilizationPct,row.evidenceState,row.evidenceFreshThrough||''].map(programPortfolioCsvCell).join(','));
  lines.push('');lines.push(programPortfolioCsvCell('Methodology'));lines.push(programPortfolioCsvCell(dashboard.methodologyNotice));
  return `\uFEFF${lines.join('\r\n')}`;
}
export async function programPortfolioExport(actor:ActorContext,format:'csv'|'json'){
  const dashboard=await programPortfolioDashboard(actor);
  const dateStamp=new Date().toISOString().slice(0,10);
  if(format==='json')return{contentType:'application/json; charset=utf-8',fileName:`opsiqo-program-portfolio-${dateStamp}.json`,body:JSON.stringify(buildProgramPortfolioEvidencePack(dashboard,actor.orgId),null,2)};
  return{contentType:'text/csv; charset=utf-8',fileName:`opsiqo-program-portfolio-${dateStamp}.csv`,body:buildProgramPortfolioCsv(dashboard)};
}
