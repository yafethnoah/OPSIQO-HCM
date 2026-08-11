import type { ActorContext } from '@/domain/security';
import type { NotificationSettings, NotificationTemplate, UserNotification } from '@/domain/notifications';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';
import { notificationSettingsSchema, notificationTemplateSchema } from './schemas';
import { randomUUID } from 'crypto';

const now=()=>new Date().toISOString();

function visibleToActor(n:UserNotification, actor:ActorContext) {
  return n.targetUid === actor.uid || n.targetRole === actor.role || n.targetRole === 'all' || (!n.targetUid && !n.targetRole && actor.permissions.includes('notifications.manage'));
}

export async function listNotifications(actor:ActorContext, limit=50) {
  const safe=Math.max(1,Math.min(limit,100));
  // Server-side merge avoids exposing another role's notifications and avoids OR-query index coupling.
  const snap=await adminDb().collection(`organizations/${actor.orgId}/notifications`).orderBy('createdAt','desc').limit(Math.min(250,safe*4)).get();
  return snap.docs.map(d=>d.data() as UserNotification).filter(n=>n.inAppVisible!==false&&visibleToActor(n,actor)).slice(0,safe);
}

export async function markNotificationRead(actor:ActorContext, notificationId:string) {
  const ref=adminDb().doc(`organizations/${actor.orgId}/notifications/${notificationId}`);
  const snap=await ref.get();
  if(!snap.exists) throw new ApiError(404,'Notification not found.','notification_not_found');
  const current=snap.data() as UserNotification;
  if(!visibleToActor(current,actor)) throw new ApiError(403,'Notification is outside your access scope.','forbidden');
  if(current.status==='read') return current;
  const timestamp=now();
  await ref.set({status:'read',readAt:timestamp},{merge:true});
  return {...current,status:'read' as const,readAt:timestamp};
}

export async function getNotificationSettings(actor:ActorContext):Promise<NotificationSettings> {
  const snap=await adminDb().doc(`organizations/${actor.orgId}/settings/notifications`).get();
  if(snap.exists) return snap.data() as NotificationSettings;
  return {id:'notifications',inAppEnabled:true,emailEnabled:false,failureAlertsEnabled:true,workflowEscalationsEnabled:true,digestFrequency:'off',updatedAt:'',updatedBy:''};
}

export async function updateNotificationSettings(actor:ActorContext,raw:unknown) {
  const input=notificationSettingsSchema.parse(raw); const timestamp=now();
  const ref=adminDb().doc(`organizations/${actor.orgId}/settings/notifications`);
  const before=(await ref.get()).data()||null;
  const next:NotificationSettings={id:'notifications',...input,updatedAt:timestamp,updatedBy:actor.uid};
  const audit=buildAudit(actor,{action:'notifications.settings.update',entityType:'settings',entityId:'notifications',before,after:next});
  const batch=adminDb().batch(); batch.set(ref,next,{merge:true}); batch.create(adminDb().doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit); await batch.commit();
  return next;
}


export async function getNotificationSettingsForOrg(orgId:string):Promise<NotificationSettings>{
  const snap=await adminDb().doc(`organizations/${orgId}/settings/notifications`).get();
  if(snap.exists) return snap.data() as NotificationSettings;
  return {id:'notifications',inAppEnabled:true,emailEnabled:false,failureAlertsEnabled:true,workflowEscalationsEnabled:true,digestFrequency:'off',updatedAt:'',updatedBy:''};
}

async function recipientEmails(orgId:string, notification:UserNotification) {
  const db=adminDb();
  const uids=new Set<string>();
  if(notification.targetUid) uids.add(notification.targetUid);
  if(notification.targetRole){
    let q:any=db.collection(`organizations/${orgId}/memberships`).where('status','==','active');
    if(notification.targetRole!=='all') q=q.where('role','==',notification.targetRole);
    // Phase 1 operational fan-out ceiling. Large broadcasts should move to a queued provider integration in Phase 2.
    const snap=await q.limit(1000).get(); for(const d of snap.docs) uids.add(String(d.id));
  }
  if(!uids.size) return [];
  const { adminAuth } = await import('@/lib/firebase/admin');
  const uidList=[...uids];
  const emails:string[]=[];
  for(let i=0;i<uidList.length;i+=100){
    const result=await adminAuth().getUsers(uidList.slice(i,i+100).map(uid=>({uid})));
    for(const user of result.users){ if(user.email) emails.push(user.email.trim().toLowerCase()); }
  }
  return [...new Set(emails)];
}

async function sendNotificationEmail(to:string, notification:UserNotification) {
  const apiKey=process.env.RESEND_API_KEY;
  const from=process.env.NOTIFICATION_FROM_EMAIL||process.env.INVITATION_FROM_EMAIL;
  if(!apiKey||!from) throw new Error('Email provider is not configured.');
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[to],subject:notification.title,html:`<p>${notification.message.replaceAll('<','&lt;').replaceAll('>','&gt;')}</p><p style="color:#64748b;font-size:12px">OPSIQO HCM operational notification</p>`})});
  if(!response.ok) throw new Error(`Email provider returned ${response.status}.`);
}

export async function processNotificationDelivery(orgId:string,limit=50){
  const db=adminDb(); const settings=await getNotificationSettingsForOrg(orgId); const summary={scanned:0,sent:0,failed:0,skipped:0};
  if(!settings.emailEnabled){summary.skipped=1;return summary;}
  const snap=await db.collection(`organizations/${orgId}/notifications`).where('emailStatus','==','pending').limit(Math.max(1,Math.min(limit,100))).get(); summary.scanned=snap.size;
  for(const doc of snap.docs){const n=doc.data() as UserNotification;const attempts=Number(n.emailAttempts||0)+1;try{const emails=await recipientEmails(orgId,n);if(!emails.length)throw new Error('No email recipient could be resolved.');for(const email of emails)await sendNotificationEmail(email,n);const timestamp=now();await doc.ref.set({emailStatus:'sent',emailAttempts:attempts,emailSentAt:timestamp,emailError:null},{merge:true});summary.sent++;}catch(error){const message=error instanceof Error?error.message:'Unknown notification delivery error';await doc.ref.set({emailStatus:attempts>=3?'failed':'pending',emailAttempts:attempts,emailError:message.slice(0,1000)},{merge:true});summary.failed++;}}
  return summary;
}


export async function listNotificationTemplates(actor:ActorContext){
  if(!actor.permissions.includes('notifications.manage')) throw new ApiError(403,'Notification administration permission required.','forbidden');
  const snap=await adminDb().collection(`organizations/${actor.orgId}/notificationTemplates`).orderBy('code','asc').limit(250).get();
  return snap.docs.map(d=>d.data() as NotificationTemplate);
}

export async function saveNotificationTemplate(actor:ActorContext,raw:unknown){
  if(!actor.permissions.includes('notifications.manage')) throw new ApiError(403,'Notification administration permission required.','forbidden');
  const input=notificationTemplateSchema.parse(raw);const placeholders=[...new Set([...input.subject.matchAll(/\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g),...input.body.matchAll(/\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g)].map(m=>m[1]!))];const declared=new Set(input.variables);const undeclared=placeholders.filter(v=>!declared.has(v));if(undeclared.length)throw new ApiError(400,`Declare template variable(s): ${undeclared.join(', ')}`,'template_variable_undeclared');const db=adminDb(),timestamp=now(),id=input.id||randomUUID(),ref=db.doc(`organizations/${actor.orgId}/notificationTemplates/${id}`),snap=await ref.get();
  const before=snap.exists?snap.data() as NotificationTemplate:null;
  if(before&&before.code!==input.code) throw new ApiError(409,'Template code is immutable after creation.','template_code_immutable');
  const dup=await db.collection(`organizations/${actor.orgId}/notificationTemplates`).where('code','==',input.code).limit(2).get();
  if(dup.docs.some(d=>d.id!==id)) throw new ApiError(409,'Notification template code already exists.','template_code_exists');
  const next:NotificationTemplate={id,code:input.code,name:input.name,subject:input.subject,body:input.body,channels:input.channels,variables:input.variables,enabled:input.enabled,createdBy:before?.createdBy||actor.uid,createdAt:before?.createdAt||timestamp,updatedBy:actor.uid,updatedAt:timestamp};
  const audit=buildAudit(actor,{action:before?'notifications.template.update':'notifications.template.create',entityType:'notificationTemplate',entityId:id,before,after:next});const b=db.batch();b.set(ref,next);b.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);await b.commit();return next;
}

export function renderNotificationTemplate(template:NotificationTemplate,values:Record<string,string|number|undefined>){
  const missing=template.variables.filter(v=>values[v]===undefined);if(missing.length)throw new ApiError(400,`Missing notification template value(s): ${missing.join(', ')}`,'template_values_missing');
  const render=(source:string)=>source.replace(/\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g,(_,key:string)=>String(values[key]??''));
  return {title:render(template.subject),message:render(template.body)};
}
