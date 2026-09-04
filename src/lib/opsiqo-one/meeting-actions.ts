import { randomUUID } from 'crypto';
import { z } from 'zod';
import type { ActorContext } from '@/domain/security';
import type { MeetingActionDashboard,MeetingActionDraft } from '@/domain/opsiqo-one-v7-15';
import type { MeetingWorkflowPromotionResult } from '@/domain/opsiqo-one-v7-16';
import type { MeetingWorkflowTemplate,MeetingWorkflowTemplateId } from '@/domain/opsiqo-one-v7-17';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';
import { createWorkflow } from '@/lib/workflow/service';

const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const schema=z.object({title:z.string().trim().min(3).max(200),meetingDate:date,participantNames:z.array(z.string().trim().min(1).max(100)).max(30).default([]),summary:z.string().trim().min(5).max(5000),decisions:z.array(z.string().trim().min(2).max(1000)).max(30).default([]),actions:z.array(z.object({description:z.string().trim().min(2).max(1000),ownerLabel:z.string().trim().max(100).optional(),dueDate:date.optional()})).max(30).default([])});
const action=z.object({action:z.enum(['review','archive'])});
const promoteSchema=z.object({workflowName:z.string().trim().min(3).max(180).optional(),actionIds:z.array(z.string()).max(30).optional(),templateId:z.enum(['action_register','sequenced_follow_up','review_gate']).default('action_register')});
const now=()=>new Date().toISOString();
function requireSelf(a:ActorContext){if(!a.permissions.includes('self.read'))throw new ApiError(403,'Signed-in employee access required.','forbidden')}
function requireWorkflowManage(a:ActorContext){if(!a.permissions.includes('workflow.manage'))throw new ApiError(403,'Workflow management permission required.','forbidden')}
function auditView(d:MeetingActionDraft){return{id:d.id,meetingDate:d.meetingDate,status:d.status,decisionCount:d.decisions.length,actionCount:d.actions.length,createdBy:d.createdBy,createdAt:d.createdAt,updatedAt:d.updatedAt,promotedWorkflowId:d.promotedWorkflowId||null,content:'[private meeting content]'}}

export const MEETING_WORKFLOW_TEMPLATES:MeetingWorkflowTemplate[]=[
 {id:'action_register',name:'Action register',description:'Create one parallel task for each selected reviewed action.',behavior:'Parallel manual follow-up tasks. No approval step is added.',requiresSeparateActivation:true,createsDisabledWorkflow:true},
 {id:'sequenced_follow_up',name:'Sequenced follow-up',description:'Create a dependency chain so each selected action follows the previous action.',behavior:'Sequential task chain using the reviewed action order.',requiresSeparateActivation:true,createsDisabledWorkflow:true},
 {id:'review_gate',name:'Follow-up + HR review gate',description:'Create parallel action tasks followed by a final HR-admin approval gate.',behavior:'All selected tasks must complete before a final human approval step becomes ready.',requiresSeparateActivation:true,createsDisabledWorkflow:true},
];
function buildMeetingWorkflowSteps(selected:MeetingActionDraft['actions'],templateId:MeetingWorkflowTemplateId,today:string){
 const days=(due?:string)=>due?Math.max(0,Math.ceil((new Date(`${due}T00:00:00Z`).getTime()-new Date(`${today}T00:00:00Z`).getTime())/86400000)):undefined;
 const taskSteps=selected.map((item,index)=>({id:`meeting-action-${index+1}`,name:item.description.slice(0,180),type:'task' as const,dueInDays:days(item.dueDate),dependsOn:templateId==='sequenced_follow_up'&&index>0?[`meeting-action-${index}`]:[]}));
 if(templateId!=='review_gate')return taskSteps;
 return [...taskSteps,{id:'meeting-review-gate',name:'Review completion of meeting follow-up',type:'approval' as const,ownerRole:'hr_admin',dependsOn:taskSteps.map(x=>x.id)}];
}


export async function meetingActionDashboard(a:ActorContext):Promise<MeetingActionDashboard>{requireSelf(a);const s=await adminDb().collection(`organizations/${a.orgId}/meetingActionDrafts`).where('createdBy','==',a.uid).limit(100).get();return{drafts:s.docs.map(d=>d.data() as MeetingActionDraft).sort((x,y)=>y.createdAt.localeCompare(x.createdAt)),governanceNotice:'Meeting-to-Action drafts belong to their creator by default. OPSIQO does not automatically write meeting notes, decisions, performance evidence, disciplinary content, health information, or goals into personnel records. Reviewed action items may be deliberately promoted into a disabled workflow definition by an authorized workflow manager; activation remains a separate audited action.'};}
export async function createMeetingActionDraft(a:ActorContext,raw:unknown){requireSelf(a);const input=schema.parse(raw),id=randomUUID(),ts=now(),row:MeetingActionDraft={id,title:input.title,meetingDate:input.meetingDate,participantNames:input.participantNames,summary:input.summary,decisions:input.decisions,actions:input.actions.map(x=>({id:randomUUID(),...x,status:'open'})),status:'draft',createdBy:a.uid,createdAt:ts,updatedAt:ts},audit=buildAudit(a,{action:'opsiqo_one.meeting_action.create',entityType:'meetingActionDraft',entityId:id,after:auditView(row)}),db=adminDb(),b=db.batch();b.create(db.doc(`organizations/${a.orgId}/meetingActionDrafts/${id}`),row);b.create(db.doc(`organizations/${a.orgId}/auditLogs/${audit.id}`),audit);await b.commit();return row;}
export async function actMeetingActionDraft(a:ActorContext,id:string,raw:unknown){requireSelf(a);const input=action.parse(raw),db=adminDb(),ref=db.doc(`organizations/${a.orgId}/meetingActionDrafts/${id}`),s=await ref.get();if(!s.exists)throw new ApiError(404,'Meeting-action draft not found.','meeting_action_not_found');const before=s.data() as MeetingActionDraft;if(before.createdBy!==a.uid)throw new ApiError(403,'Meeting-action draft is private to its creator.','forbidden');const ts=now(),after={...before,status:input.action==='review'?'reviewed' as const:'archived' as const,updatedAt:ts,...(input.action==='review'?{reviewedAt:ts}:{archivedAt:ts})},audit=buildAudit(a,{action:`opsiqo_one.meeting_action.${input.action}`,entityType:'meetingActionDraft',entityId:id,before:auditView(before),after:auditView(after)}),b=db.batch();b.set(ref,after);b.create(db.doc(`organizations/${a.orgId}/auditLogs/${audit.id}`),audit);await b.commit();return after;}

export async function promoteMeetingActionsToWorkflow(a:ActorContext,id:string,raw:unknown):Promise<MeetingWorkflowPromotionResult>{
 requireSelf(a);requireWorkflowManage(a);const input=promoteSchema.parse(raw),db=adminDb(),ref=db.doc(`organizations/${a.orgId}/meetingActionDrafts/${id}`),snap=await ref.get();
 if(!snap.exists)throw new ApiError(404,'Meeting-action draft not found.','meeting_action_not_found');const before=snap.data() as MeetingActionDraft;
 if(before.createdBy!==a.uid)throw new ApiError(403,'Meeting-action draft is private to its creator.','forbidden');
 if(before.status!=='reviewed')throw new ApiError(409,'Review the meeting-action draft before promoting it to workflow.','meeting_action_review_required');
 if(before.promotedWorkflowId)throw new ApiError(409,'This meeting draft has already been promoted to a workflow.','meeting_action_already_promoted');
 const selected=before.actions.filter(x=>x.status==='open'&&(!input.actionIds?.length||input.actionIds.includes(x.id)));
 if(!selected.length)throw new ApiError(409,'No open reviewed meeting actions were selected for workflow promotion.','meeting_action_no_promotable_actions');
 const today=new Date().toISOString().slice(0,10),template=MEETING_WORKFLOW_TEMPLATES.find(x=>x.id===input.templateId)!;
 const workflow=await createWorkflow(a,{name:input.workflowName||`Meeting follow-up — ${before.title}`,description:`Reviewed action items promoted from meeting-action draft ${id} using template ${template.name}. This definition is intentionally disabled until separately reviewed and enabled.`,trigger:'manual',conditions:[],conditionMode:'all',enabled:false,steps:buildMeetingWorkflowSteps(selected,input.templateId,today)});
 const ts=now(),after:MeetingActionDraft={...before,promotedWorkflowId:workflow.id,promotedAt:ts,updatedAt:ts};
 const audit=buildAudit(a,{action:'opsiqo_one.meeting_action.promote_workflow',entityType:'meetingActionDraft',entityId:id,before:auditView(before),after:auditView(after),metadata:{workflowId:workflow.id,promotedActionCount:selected.length,workflowEnabled:false,templateId:input.templateId}});
 const batch=db.batch();batch.set(ref,{promotedWorkflowId:workflow.id,promotedAt:ts,updatedAt:ts},{merge:true});batch.create(db.doc(`organizations/${a.orgId}/auditLogs/${audit.id}`),audit);await batch.commit();
 return{draftId:id,workflowId:workflow.id,workflowName:workflow.name,promotedActionCount:selected.length,workflowEnabled:false,requiresSeparateActivation:true,templateId:input.templateId};
}
