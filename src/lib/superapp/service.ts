import type { ActorContext } from '@/domain/security';
import type { SuperAppAttentionItem,SuperAppDashboard,SuperAppDataState,SuperAppEmployeeSummary,SuperAppHealth,SuperAppManagerSummary,SuperAppMode,SuperAppPreference } from '@/domain/superapp';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';
import { getEmployee } from '@/lib/hr/service';
import { listNotifications } from '@/lib/notifications/service';
import { getLeaveWorkspace } from '@/lib/time/service';
import { learningDashboard } from '@/lib/learning/service';
import { performanceDashboard } from '@/lib/performance/service';
import { complianceDashboard,listEmployeeDocuments } from '@/lib/compliance/service';
import { compensationDashboard } from '@/lib/compensation/service';
import { experienceDashboard } from '@/lib/experience/service';
import { visibleSuperAppActions } from './catalog';
import { assessedTeamCompliance,attentionScore,sanitizePinned,sortAttention,superAppPrivacy } from './guardrails';
import { preferenceSchema } from './schemas';

const now=()=>new Date().toISOString();
const today=()=>now().slice(0,10);
async function listManagerTeam(actor:ActorContext){
 if(!actor.workerId)throw new ApiError(409,'Worker-linked membership required for manager mode.','worker_link_required');
 const db=adminDb(),snap=await db.collection(`organizations/${actor.orgId}/assignments`).where('managerWorkerId','==',actor.workerId).get();
 const current=snap.docs.map(d=>d.data() as any).filter(a=>a.primary===true&&a.startDate<=today()&&(!a.endDate||a.endDate>=today()));
 const workerIds=[...new Set(current.map(a=>String(a.workerId)).filter(Boolean))],positionIds=[...new Set(current.map(a=>String(a.positionId)).filter(Boolean))],unitIds=[...new Set(current.map(a=>String(a.orgUnitId)).filter(Boolean))];
 const [workers,positions,units]=await Promise.all([
  Promise.all(workerIds.map(async id=>{const s=await db.doc(`organizations/${actor.orgId}/workers/${id}`).get();return s.exists?s.data() as any:null})),
  Promise.all(positionIds.map(async id=>{const s=await db.doc(`organizations/${actor.orgId}/positions/${id}`).get();return s.exists?s.data() as any:null})),
  Promise.all(unitIds.map(async id=>{const s=await db.doc(`organizations/${actor.orgId}/orgUnits/${id}`).get();return s.exists?s.data() as any:null}))
 ]);
 const wm=Object.fromEntries(workers.filter(Boolean).map((x:any)=>[x.id,x])),pm=Object.fromEntries(positions.filter(Boolean).map((x:any)=>[x.id,x])),um=Object.fromEntries(units.filter(Boolean).map((x:any)=>[x.id,x]));
 return current.map(a=>({worker:wm[a.workerId],position:pm[a.positionId]||null,orgUnit:um[a.orgUnitId]||null,assignment:a})).filter(x=>Boolean(x.worker));
}
const has=(actor:ActorContext,p:string)=>actor.permissions.includes(p as any);
type Loaded<T>={state:SuperAppDataState;value:T|null;message?:string};
const health=(x:Loaded<unknown>)=>({state:x.state,message:x.message});
async function load<T>(allowed:boolean,fn:()=>Promise<T>,label:string):Promise<Loaded<T>>{
 if(!allowed)return{state:'not_permitted',value:null};
 try{return{state:'available',value:await fn()}}catch(e){return{state:'unavailable',value:null,message:`${label} could not be loaded.`}}
}
async function countQuery(q:any):Promise<number>{
 if(typeof q.count==='function'){const snap=await q.count().get();return Number(snap.data()?.count||0)}
 let total=0,last:any=null;
 for(;;){let page=q.orderBy('__name__').limit(500);if(last)page=page.startAfter(last);const snap=await page.get();total+=snap.size;if(snap.size<500)return total;last=snap.docs[snap.docs.length-1]}
}
async function countWorkerStatus(orgId:string,collection:string,workerId:string,status:string){
 return countQuery(adminDb().collection(`organizations/${orgId}/${collection}`).where('workerId','==',workerId).where('status','==',status));
}
async function countTeamStatus(orgId:string,collection:string,workerIds:string[],status:string){
 let total=0;for(let i=0;i<workerIds.length;i+=30){const ids=workerIds.slice(i,i+30);if(!ids.length)continue;total+=await countQuery(adminDb().collection(`organizations/${orgId}/${collection}`).where('workerId','in',ids).where('status','==',status))}return total;
}
function requireSelf(actor:ActorContext){if(!has(actor,'self.read'))throw new ApiError(403,'SuperApp requires self-service access.','forbidden')}
function defaultPreference(actor:ActorContext):SuperAppPreference{return{id:actor.uid,uid:actor.uid,homeMode:'auto',pinnedActionIds:[],compactMode:false,locale:'auto',timeZone:'auto',updatedBy:actor.uid,updatedAt:''}}
export async function getSuperAppPreference(actor:ActorContext){requireSelf(actor);const s=await adminDb().doc(`organizations/${actor.orgId}/superAppPreferences/${actor.uid}`).get();return s.exists?{...defaultPreference(actor),...(s.data() as Partial<SuperAppPreference>)}:defaultPreference(actor)}
export async function saveSuperAppPreference(actor:ActorContext,raw:unknown){
 requireSelf(actor);const i=preferenceSchema.parse(raw),mode:SuperAppMode=actor.role==='manager'?'manager':'employee',allowed=visibleSuperAppActions(actor,mode),pinnedActionIds=sanitizePinned(i.pinnedActionIds,new Set(allowed.map(x=>x.id))),before=await getSuperAppPreference(actor),timestamp=now(),next:SuperAppPreference={id:actor.uid,uid:actor.uid,homeMode:i.homeMode==='manager'&&actor.role!=='manager'?'employee':i.homeMode,pinnedActionIds,compactMode:i.compactMode,locale:i.locale,timeZone:i.timeZone,updatedBy:actor.uid,updatedAt:timestamp},db=adminDb(),audit=buildAudit(actor,{action:'superapp.preference.update',entityType:'superAppPreference',entityId:actor.uid,before,after:next}),b=db.batch();b.set(db.doc(`organizations/${actor.orgId}/superAppPreferences/${actor.uid}`),next,{merge:false});b.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);await b.commit();return next;
}
function dueSort(rows:any[]){return [...rows].sort((a,b)=>String(a.dueAt||a.createdAt||'9999').localeCompare(String(b.dueAt||b.createdAt||'9999')))}
function emptyEmployee():SuperAppEmployeeSummary{return{linked:false,leave:{availableHours:0,pendingRequests:0},time:{draftTimesheets:0,submittedTimesheets:0,openExceptions:0},learning:{active:0,overdue:0,certificates:0},compliance:{assessed:false,gaps:0,expiring:0},performance:{activeGoals:0,awaitingSelfReview:0},service:{openTickets:0},notifications:{unread:0,highPriority:0,recentOnly:false},documents:{visibleCount:0}}}
function emptyHealth(state:SuperAppDataState='not_assessed'):SuperAppHealth{const x={state};return{profile:x,notifications:x,leave:x,time:x,learning:x,compliance:x,performance:x,compensation:x,service:x,documents:x,team:x,teamCompliance:x,teamLeaveApprovals:x,teamTimeApprovals:x}}
function unavailableAttention(h:SuperAppHealth):SuperAppAttentionItem|undefined{const bad=Object.entries(h).filter(([,v])=>v.state==='unavailable').map(([k])=>k);return bad.length?{id:'data-unavailable',type:'system',severity:'high',title:'Some HR data is unavailable',summary:`OPSIQO could not verify: ${bad.join(', ')}. Values are shown as unavailable instead of zero.`,href:'/home',count:bad.length,priorityScore:attentionScore('high',undefined,bad.length)}:undefined}

export async function superAppDashboard(actor:ActorContext):Promise<SuperAppDashboard>{
 requireSelf(actor);
 const pref=await getSuperAppPreference(actor),mode:SuperAppMode=actor.role==='manager'&&(pref.homeMode==='auto'||pref.homeMode==='manager')?'manager':'employee',actions=visibleSuperAppActions(actor,mode),safePref={...pref,pinnedActionIds:sanitizePinned(pref.pinnedActionIds,new Set(actions.map(x=>x.id)))};
 if(!actor.workerId){const h=emptyHealth('not_assessed');return{mode,role:actor.role,employee:emptyEmployee(),manager:mode==='manager'?{teamSize:0,active:0,onLeave:0,pendingLeaveApprovals:0,submittedTimesheets:0,awaitingManagerReviews:0,overdueLearning:0,teamComplianceGaps:0,teamComplianceAssessed:0,teamComplianceTotal:0}:undefined,team:[],attention:[{id:'worker-link-required',type:'identity',severity:'high',title:'Employee record link required',summary:'Your membership is active but is not linked to a worker record. Ask HR to link the membership before using employee or manager self-service.',href:'/self-service',priorityScore:attentionScore('high')}],actions,preference:safePref,health:h,concierge:{mode:'guided',title:'OPSIQO Concierge',message:'Employee-linked identity is required before personalized guidance can be generated.',suggestions:[{label:'Open My HR',href:'/self-service'}]},privacy:superAppPrivacy,generatedAt:now()}}

 const [profileL,notificationsL,leaveL,learningL,performanceL,complianceL,compensationL,experienceL,documentsL,timeL,teamL]=await Promise.all([
  load(true,()=>getEmployee(actor,actor.workerId!),'employee profile'),
  load(has(actor,'notifications.read'),()=>listNotifications(actor,30),'notifications'),
  load(has(actor,'leave.read'),()=>getLeaveWorkspace(actor,actor.workerId!),'leave'),
  load(has(actor,'learning.read'),()=>learningDashboard(actor),'learning'),
  load(has(actor,'performance.read'),()=>performanceDashboard(actor),'performance'),
  load(has(actor,'compliance.read'),()=>complianceDashboard(actor),'compliance'),
  load(has(actor,'compensation.read'),()=>compensationDashboard(actor),'compensation'),
  load(has(actor,'experience.read')||has(actor,'service.read'),()=>experienceDashboard(actor),'HR service'),
  load(has(actor,'documents.read'),()=>listEmployeeDocuments(actor,actor.workerId!),'documents'),
  load(has(actor,'time.read'),async()=>({draft:await countWorkerStatus(actor.orgId,'timesheets',actor.workerId!,'draft'),submitted:await countWorkerStatus(actor.orgId,'timesheets',actor.workerId!,'submitted'),exceptions:await countWorkerStatus(actor.orgId,'timeExceptions',actor.workerId!,'open')}),'time'),
  load(mode==='manager'&&has(actor,'team.read'),()=>listManagerTeam(actor),'manager team')
 ]);
 const profile:any=profileL.value;
 if(profileL.state==='unavailable'||!profile?.worker){const h={...emptyHealth('not_assessed'),profile:health(profileL)};return{mode,role:actor.role,workerId:actor.workerId,employee:emptyEmployee(),manager:mode==='manager'?{teamSize:0,active:0,onLeave:0,pendingLeaveApprovals:0,submittedTimesheets:0,awaitingManagerReviews:0,overdueLearning:0,teamComplianceGaps:0,teamComplianceAssessed:0,teamComplianceTotal:0}:undefined,team:[],attention:[{id:'worker-record-missing',type:'identity',severity:'critical',title:'Linked worker record is unavailable',summary:'Your membership references a worker record that could not be loaded. HR should verify the membership-to-worker link before self-service continues.',href:'/self-service',priorityScore:attentionScore('critical')}],actions,preference:safePref,health:h,concierge:{mode:'guided',title:'OPSIQO Concierge',message:'Personalized guidance is paused until the worker link is repaired.',suggestions:[{label:'Open My HR',href:'/self-service'}]},privacy:superAppPrivacy,generatedAt:now()}}

 const notifications:any[]=Array.isArray(notificationsL.value)?notificationsL.value:[],leave:any=leaveL.value,learning:any=learningL.value,performance:any=performanceL.value,compliance:any=complianceL.value,compensation:any=compensationL.value,experience:any=experienceL.value,documents:any[]=Array.isArray(documentsL.value)?documentsL.value:[],time:any=timeL.value,teamRows:any[]=Array.isArray(teamL.value)?teamL.value:[];
 if(notificationsL.state==='available'&&notifications.length>=30){notificationsL.state='partial';notificationsL.message='Notification totals are based on the 30 most recent visible notifications.'}if(documentsL.state==='available'&&documents.length>=300){documentsL.state='partial';documentsL.message='Document count is based on the 300 most recent visible documents; open Documents for the authoritative list.'}
 const currentAssignment=profile.assignments?.find((x:any)=>x.current&&x.primary)??profile.assignments?.find((x:any)=>x.current),compView=compensation?.workers?.find((x:any)=>x.workerId===actor.workerId),compRow=compliance?.rows?.find((x:any)=>x.workerId===actor.workerId),myLearning=(learning?.assignments||[]).filter((x:any)=>x.workerId===actor.workerId),myCertificates=(learning?.certificates||[]).filter((x:any)=>x.workerId===actor.workerId&&x.status==='valid'),myPerformanceReviews=(performance?.reviews||[]).filter((x:any)=>x.workerId===actor.workerId),myGoals=(performance?.goals||[]).filter((x:any)=>x.workerId===actor.workerId),myTickets=(experience?.tickets||[]).filter((x:any)=>x.requesterWorkerId===actor.workerId),unread=notifications.filter(x=>x.status!=='read'),leaveBalances=leave?.balances||[],leaveTypes=new Map((leave?.types||[]).map((x:any)=>[x.id,x])),availableHours=leaveBalances.filter((x:any)=>(leaveTypes.get(x.leaveTypeId) as any)?.paid!==false).reduce((n:number,x:any)=>n+Math.max(0,Number(x.availableHours||0)),0);
 const employee:SuperAppEmployeeSummary={linked:true,worker:{id:profile.worker.id,displayName:profile.worker.displayName,employeeNumber:profile.worker.employeeNumber,status:profile.worker.status,hireDate:profile.worker.hireDate},assignment:currentAssignment?{positionTitle:currentAssignment.position?.title,orgUnitName:currentAssignment.orgUnit?.name,managerName:currentAssignment.manager?.displayName}:undefined,leave:{availableHours:Math.round(availableHours*100)/100,pendingRequests:(leave?.requests||[]).filter((x:any)=>x.status==='pending').length},time:{draftTimesheets:Number(time?.draft||0),submittedTimesheets:Number(time?.submitted||0),openExceptions:Number(time?.exceptions||0)},learning:{active:myLearning.filter((x:any)=>['assigned','in_progress'].includes(x.status)).length,overdue:myLearning.filter((x:any)=>x.dueAt&&x.dueAt<now()&&!['completed','waived','expired'].includes(x.status)).length,certificates:myCertificates.length},compliance:{assessed:Boolean(compRow),score:compRow?Number(compRow.score):undefined,gaps:Number(compRow?.overdue??0),expiring:Number(compRow?.expiring??0)},performance:{activeGoals:myGoals.filter((x:any)=>['active','at_risk'].includes(x.status)).length,awaitingSelfReview:myPerformanceReviews.filter((x:any)=>['not_started','self_in_progress'].includes(x.status)).length},rewards:compView?.totalRewards?{currency:compView.totalRewards.currency,totalRewardsValue:Number(compView.totalRewards.totalRewardsValue||0),asOfDate:compView.totalRewards.asOfDate}:undefined,service:{openTickets:myTickets.filter((x:any)=>!['resolved','closed','cancelled'].includes(x.status)).length},notifications:{unread:unread.length,highPriority:unread.filter((x:any)=>['high','urgent','critical'].includes(String(x.priority||'').toLowerCase())).length,recentOnly:notificationsL.state==='partial'},documents:{visibleCount:documents.length}};
 const h:SuperAppHealth={profile:health(profileL),notifications:health(notificationsL),leave:health(leaveL),time:health(timeL),learning:health(learningL),compliance:compRow?health(complianceL):complianceL.state==='available'?{state:'not_assessed'}:health(complianceL),performance:health(performanceL),compensation:health(compensationL),service:health(experienceL),documents:health(documentsL),team:health(teamL),teamCompliance:{state:'not_permitted'},teamLeaveApprovals:{state:'not_permitted'},teamTimeApprovals:{state:'not_permitted'}};
 const attention:SuperAppAttentionItem[]=[];
 if(h.notifications.state!=='unavailable'&&h.notifications.state!=='not_permitted'&&employee.notifications.highPriority)attention.push({id:'high-notifications',type:'notification',severity:'high',title:'Important notifications',summary:`${employee.notifications.highPriority} high-priority notification(s) need review.`,href:'/notifications',count:employee.notifications.highPriority,priorityScore:attentionScore('high',undefined,employee.notifications.highPriority)});
 if(h.compliance.state==='available'&&employee.compliance.gaps)attention.push({id:'compliance-gaps',type:'compliance',severity:'high',title:'Compliance items need attention',summary:`${employee.compliance.gaps} requirement(s) are currently incomplete.`,href:'/compliance',count:employee.compliance.gaps,priorityScore:attentionScore('high',undefined,employee.compliance.gaps)});
 const overdueLearning=dueSort(myLearning.filter((x:any)=>x.dueAt&&x.dueAt<now()&&!['completed','waived','expired'].includes(x.status)));if(h.learning.state==='available'&&overdueLearning.length)attention.push({id:'learning-overdue',type:'learning',severity:'high',title:'Learning overdue',summary:`${overdueLearning.length} learning assignment(s) are overdue.`,href:'/learning',dueAt:overdueLearning[0]?.dueAt,count:overdueLearning.length,priorityScore:attentionScore('high',overdueLearning[0]?.dueAt,overdueLearning.length)});
 if(h.performance.state==='available'&&employee.performance.awaitingSelfReview)attention.push({id:'self-review',type:'performance',severity:'medium',title:'Self-assessment is waiting',summary:`${employee.performance.awaitingSelfReview} performance review(s) need your self-assessment.`,href:'/performance',count:employee.performance.awaitingSelfReview,priorityScore:attentionScore('medium',undefined,employee.performance.awaitingSelfReview)});
 if(h.time.state==='available'&&employee.time.submittedTimesheets)attention.push({id:'submitted-timesheet',type:'time',severity:'info',title:'Timesheet awaiting approval',summary:`${employee.time.submittedTimesheets} submitted timesheet(s) are waiting for manager action.`,href:'/time',count:employee.time.submittedTimesheets,priorityScore:attentionScore('info',undefined,employee.time.submittedTimesheets)});

 let manager:SuperAppManagerSummary|undefined,team:Array<{workerId:string;displayName:string;employeeNumber:string;status:string;positionTitle?:string;orgUnitName?:string}>=[];
 if(mode==='manager'){
  const ids=teamRows.map(x=>String(x.worker.id)),idSet=new Set(ids);
  const [managerLeaveL,managerTimeL]=teamL.state==='available'?await Promise.all([
   load(has(actor,'leave.approve'),()=>countTeamStatus(actor.orgId,'leaveRequests',ids,'pending'),'team leave approvals'),
   load(has(actor,'time.approve'),()=>countTeamStatus(actor.orgId,'timesheets',ids,'submitted'),'team timesheet approvals')
  ]):[{state:'unavailable',value:null,message:'Manager team could not be loaded.'} as Loaded<number>,{state:'unavailable',value:null,message:'Manager team could not be loaded.'} as Loaded<number>];h.teamLeaveApprovals=health(managerLeaveL);h.teamTimeApprovals=health(managerTimeL);
  const teamPerf=has(actor,'performance.read')&&has(actor,'performance.review')?(performance?.reviews||[]).filter((x:any)=>idSet.has(String(x.workerId))&&x.managerWorkerId===actor.workerId&&['awaiting_manager','manager_in_progress'].includes(x.status)):[],teamLearning=has(actor,'learning.read')&&has(actor,'learning.assign')?(learning?.assignments||[]).filter((x:any)=>idSet.has(String(x.workerId))):[],teamCompliance=h.compliance.state!=='not_permitted'&&h.compliance.state!=='unavailable'?(compliance?.rows||[]).filter((x:any)=>idSet.has(String(x.workerId))):[],overdueTeamLearning=teamLearning.filter((x:any)=>x.dueAt&&x.dueAt<now()&&!['completed','waived','expired'].includes(x.status));
  const compSummary=assessedTeamCompliance(teamCompliance,ids.length);
  if(teamL.state==='unavailable')h.teamCompliance={state:'unavailable',message:'Manager team could not be loaded.'};
  else if(has(actor,'compliance.read'))h.teamCompliance={state:compSummary.state,message:compSummary.state==='partial'?'Team compliance rate covers assessed workers only.':undefined};
  manager={teamSize:ids.length,active:teamRows.filter(x=>x.worker.status==='active').length,onLeave:teamRows.filter(x=>x.worker.status==='leave').length,pendingLeaveApprovals:Number(managerLeaveL.value||0),submittedTimesheets:Number(managerTimeL.value||0),awaitingManagerReviews:teamPerf.length,overdueLearning:overdueTeamLearning.length,teamComplianceGaps:teamCompliance.reduce((n:number,x:any)=>n+Number(x.overdue||0),0),teamComplianceRate:compSummary.rate,teamComplianceAssessed:compSummary.assessed,teamComplianceTotal:ids.length};
  team=teamRows.map(x=>({workerId:x.worker.id,displayName:x.worker.displayName,employeeNumber:x.worker.employeeNumber,status:x.worker.status,positionTitle:x.position?.title,orgUnitName:x.orgUnit?.name}));
  if(managerLeaveL.state==='available'&&manager.pendingLeaveApprovals)attention.push({id:'manager-leave',type:'approval',severity:'high',title:'Leave approvals waiting',summary:`${manager.pendingLeaveApprovals} team leave request(s) need approval.`,href:'/time',count:manager.pendingLeaveApprovals,priorityScore:attentionScore('high',undefined,manager.pendingLeaveApprovals)});
  if(managerTimeL.state==='available'&&manager.submittedTimesheets)attention.push({id:'manager-timesheet',type:'approval',severity:'high',title:'Timesheets waiting',summary:`${manager.submittedTimesheets} submitted team timesheet(s) need review.`,href:'/time',count:manager.submittedTimesheets,priorityScore:attentionScore('high',undefined,manager.submittedTimesheets)});
  if(has(actor,'performance.review')&&manager.awaitingManagerReviews)attention.push({id:'manager-review',type:'approval',severity:'high',title:'Manager assessments waiting',summary:`${manager.awaitingManagerReviews} performance review(s) require manager assessment.`,href:'/performance',count:manager.awaitingManagerReviews,priorityScore:attentionScore('high',undefined,manager.awaitingManagerReviews)});
  if(has(actor,'compliance.read')&&manager.teamComplianceGaps)attention.push({id:'manager-compliance',type:'team',severity:'medium',title:'Team compliance gaps',summary:`${manager.teamComplianceGaps} assessed team compliance item(s) need attention.`,href:'/compliance',count:manager.teamComplianceGaps,priorityScore:attentionScore('medium',undefined,manager.teamComplianceGaps)});
  if(has(actor,'learning.assign')&&manager.overdueLearning)attention.push({id:'manager-learning',type:'team',severity:'medium',title:'Team learning overdue',summary:`${manager.overdueLearning} team learning assignment(s) are overdue.`,href:'/learning',count:manager.overdueLearning,priorityScore:attentionScore('medium',undefined,manager.overdueLearning)});
 }
 const systemAttention=unavailableAttention(h);if(systemAttention)attention.push(systemAttention);
 const ai=has(actor,'ai.use'),concierge=ai?{mode:'ai_copilot' as const,title:mode==='manager'?'Manager Copilot':'Employee Concierge',message:'Use governed AI HR Copilot for evidence-first guidance. Consequential HR actions still require the normal authorized workflow.',suggestions:mode==='manager'?[{label:'Summarize my manager attention queue',href:'/ai-copilot'},{label:'Help me prepare for team reviews',href:'/ai-copilot'},{label:'Explain team compliance evidence',href:'/ai-copilot'}]:[{label:'Explain my HR tasks',href:'/ai-copilot'}]}:{mode:'guided' as const,title:'Employee Concierge',message:'Your role uses guided self-service routing. Generative AI is not enabled for this membership.',suggestions:[{label:'Ask HR for help',href:'/experience'},{label:'Find policies and compliance',href:'/compliance'},{label:'Plan learning and career',href:'/learning'}]};
 return{mode,role:actor.role,workerId:actor.workerId,employee,manager,team,attention:sortAttention(attention).slice(0,12),actions,preference:safePref,health:h,concierge,privacy:superAppPrivacy,generatedAt:now()};
}
