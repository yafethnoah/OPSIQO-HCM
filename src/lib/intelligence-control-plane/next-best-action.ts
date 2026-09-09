import { createHash } from 'node:crypto';
import type { ActorContext } from '@/domain/security';
import type { DomainEvent } from '@/domain/automation';
import type { NextBestAction } from '@/domain/intelligence-control-plane';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';
import { evaluateAutonomy } from './autonomy-policy';

const now=()=>new Date().toISOString();
type RawEvent=Partial<Pick<DomainEvent,'id'|'type'|'entityType'|'entityId'|'createdAt'>> & {
  eventId?: unknown;
  eventType?: unknown;
  name?: unknown;
  aggregateType?: unknown;
  subjectType?: unknown;
  aggregateId?: unknown;
  subjectId?: unknown;
  occurredAt?: unknown;
  timestamp?: unknown;
};
const eventType=(e:RawEvent)=>String(e.type||e.eventType||e.name||'').trim();
const entityType=(e:RawEvent)=>String(e.entityType||e.aggregateType||e.subjectType||'record').trim();
const entityId=(e:RawEvent)=>String(e.entityId||e.aggregateId||e.subjectId||e.id||'unknown').trim();
const eventId=(e:RawEvent)=>String(e.id||e.eventId||createHash('sha256').update(JSON.stringify(e)).digest('hex').slice(0,24));
const eventTime=(e:RawEvent)=>String(e.occurredAt||e.createdAt||e.timestamp||now());
const actionId=(orgId:string,eventIdValue:string,code:string)=>createHash('sha256').update(`${orgId}|${eventIdValue}|${code}`).digest('hex').slice(0,32);

type Rule={pattern:RegExp;code:string;title:string;why:string;role:string;urgency:NextBestAction['urgency'];reversible:boolean;tool:string;expected:string;deadlineHours?:number;policyRefs?:string[]};
const RULES:Rule[]=[
 {pattern:/learning\.certificate_expiring|document\.expiring/i,code:'expiry_review',title:'Review expiring workforce evidence',why:'A governed certificate or document is approaching expiry and requires owner review before it becomes a compliance or workforce-readiness gap.',role:'hr_admin',urgency:'soon',reversible:true,tool:'workflow:create_review_task',expected:'Verified renewal, replacement, exception, or documented no-action decision.',deadlineHours:120},
 {pattern:/policy\.review_due/i,code:'policy_review',title:'Start due policy review',why:'A governed policy has reached its review date and should be reassessed before continued reliance.',role:'hr_admin',urgency:'soon',reversible:true,tool:'workflow:policy_review',expected:'Policy evidence reviewed and routed for human approval if changes are required.',deadlineHours:120},
 {pattern:/compliance\.gap/i,code:'compliance_gap',title:'Review compliance evidence gap',why:'OPSIQO detected a gap in configured compliance evidence. This is an operational signal, not a legal conclusion.',role:'hr_admin',urgency:'urgent',reversible:true,tool:'workflow:compliance_review',expected:'Gap investigated, evidence corrected, or human/legal review opened.',deadlineHours:48},
 {pattern:/onboarding\.ready|hire\.completed/i,code:'onboarding_ready',title:'Complete governed onboarding preparation',why:'An approved hire is ready for cross-module onboarding preparation.',role:'hr_admin',urgency:'urgent',reversible:true,tool:'orchestrator:onboarding_saga',expected:'Onboarding tasks prepared and low-risk authorized steps coordinated; consequential steps remain human-controlled.',deadlineHours:24},
 {pattern:/separation\.approved|separation\.ready/i,code:'offboarding_ready',title:'Continue controlled offboarding',why:'An approved separation has outstanding operational offboarding work that should be coordinated across HR, identity, equipment, policy and payroll checklists.',role:'hr_admin',urgency:'urgent',reversible:false,tool:'orchestrator:offboarding_saga',expected:'Authorized operational tasks completed with evidence and reconciliation; employment decision itself is never made by AI.',deadlineHours:24},
 {pattern:/time\.exception|timesheet\.submitted/i,code:'time_review',title:'Review time exception or submitted timesheet',why:'Time evidence is waiting for authorized review.',role:'manager',urgency:'soon',reversible:true,tool:'workflow:time_review',expected:'Time record reviewed through the authoritative time service.',deadlineHours:48},
 {pattern:/service\.ticket_sla_breached/i,code:'service_sla',title:'Resolve HR service SLA breach',why:'An employee service request exceeded its configured response target.',role:'hr_admin',urgency:'urgent',reversible:true,tool:'workflow:service_escalation',expected:'Ticket owner alerted and service response restored.',deadlineHours:8},
 {pattern:/performance\.pip_overdue|diagnostic\.remediation_overdue/i,code:'overdue_review',title:'Review overdue governed action',why:'A configured governed action is overdue and needs an authorized owner response.',role:'hr_admin',urgency:'urgent',reversible:true,tool:'workflow:overdue_review',expected:'Owner action, escalation, or documented exception.',deadlineHours:24},
 {pattern:/requisition\.opened|application\.created/i,code:'recruiting_attention',title:'Review recruiting pipeline work',why:'New recruiting work is available for structured, evidence-based review.',role:'recruiter',urgency:'routine',reversible:true,tool:'recruiting:review_queue',expected:'Candidate evidence reviewed without protected-trait scoring or autonomous hiring decisions.',deadlineHours:72},
];
function build(actor:ActorContext,e:RawEvent,rule:Rule):NextBestAction{const id=eventId(e),time=eventTime(e),auto=evaluateAutonomy(actor,{actionType:rule.tool,description:`${rule.title}. ${rule.why}`,reversible:rule.reversible,preauthorized:false,employmentConsequence:false}),deadline=rule.deadlineHours?new Date(Date.parse(time)+rule.deadlineHours*3600000).toISOString():undefined;return{actionId:actionId(actor.orgId,id,rule.code),organizationId:actor.orgId,title:rule.title,why:rule.why,affectedObject:{type:entityType(e),id:entityId(e)},evidenceRefs:[`domainEvent:${id}`],policyRefs:rule.policyRefs||[],regulatoryRefs:[],responsibleRole:rule.role,deadline,urgency:rule.urgency,risk:auto.risk,confidence:90,autonomyLevel:auto.level,approvalRequired:auto.humanCheckpoint||auto.humanDecisionRequired,expectedOutcome:rule.expected,reversible:rule.reversible,toolOrWorkflow:rule.tool,status:auto.level>=3?'awaiting_approval':'detected',sourceEventId:id,createdAt:now(),updatedAt:now()};}
export function detectNextBestActionsFromEvents(actor:ActorContext,events:RawEvent[]){const out:NextBestAction[]=[];for(const e of events){const t=eventType(e),rule=RULES.find(r=>r.pattern.test(t));if(rule)out.push(build(actor,e,rule));}return out;}
async function persistDetectedActions(actor:ActorContext,detected:NextBestAction[]){const db=adminDb();for(const a of detected){const ref=db.doc(`organizations/${actor.orgId}/nextBestActions/${a.actionId}`),snap=await ref.get(),before=snap.exists?snap.data() as NextBestAction:undefined;if(before&&['completed','cancelled'].includes(before.status))continue;const row={...a,createdAt:before?.createdAt||a.createdAt},audit=buildAudit(actor,{action:before?'intelligence.next_action.refresh':'intelligence.next_action.detect',entityType:'nextBestAction',entityId:a.actionId,before,after:row}),batch=db.batch();if(before)batch.set(ref,row,{merge:true});else batch.create(ref,row);batch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);await batch.commit();}return detected;}
export async function recordNextBestActionsForEvent(actor:ActorContext,event:RawEvent){return persistDetectedActions(actor,detectNextBestActionsFromEvents(actor,[event]));}
export async function refreshNextBestActions(actor:ActorContext){if(!actor.permissions.includes('ai.use'))throw new ApiError(403,'AI use permission required.','forbidden');const events=await adminDb().collection(`organizations/${actor.orgId}/domainEvents`).orderBy('createdAt','desc').limit(250).get(),detected=detectNextBestActionsFromEvents(actor,events.docs.map(d=>({id:d.id,...d.data()})));await persistDetectedActions(actor,detected);return listNextBestActions(actor,{limit:100});}
export async function listNextBestActions(actor:ActorContext,input:{limit?:number;status?:string}={}){if(!(actor.permissions.includes('self.read')||actor.permissions.includes('ai.use')))throw new ApiError(403,'Next action read permission required.','forbidden');const limit=Math.max(1,Math.min(150,input.limit||50)),snap=await adminDb().collection(`organizations/${actor.orgId}/nextBestActions`).orderBy('updatedAt','desc').limit(limit*2).get(),role=actor.role==='employee'?'employee':actor.role==='manager'?'manager':null;return snap.docs.map(d=>d.data() as NextBestAction).filter(a=>!input.status||a.status===input.status).filter(a=>!role||a.responsibleRole===role||a.responsibleRole==='employee').slice(0,limit);}
