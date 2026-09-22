import { randomUUID } from 'crypto';
import type { ActorContext } from '@/domain/security';
import type { MobileDeviceRegistration } from '@/domain/mobile';
import type { Worker } from '@/domain/hr';
import type { LeaveRequest, TimeEntry } from '@/domain/time';
import { adminDb } from '@/lib/firebase/admin';
import { buildAudit } from '@/lib/audit/service';
import { ApiError } from '@/lib/http/errors';
import { z } from 'zod';

const EXPO_PUSH_URL='https://exp.host/--/api/v2/push/send';
const adminRoles=new Set(['super_admin','org_admin','hr_admin']);

export const attendanceBroadcastSchema=z.object({
  action:z.enum(['clock_in','clock_out']),
  scope:z.enum(['all_active','not_clocked_in','clocked_in']).default('all_active'),
  message:z.string().trim().max(500).optional(),
  reason:z.string().trim().min(10,'Provide an operational reason of at least 10 characters.').max(1000),
  excludeApprovedLeave:z.boolean().default(true),
});

function validExpoToken(value:unknown){
  const token=String(value||'').trim();
  return /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(token)?token:'';
}

function chunks<T>(rows:T[],size:number){
  const out:T[][]=[];
  for(let i=0;i<rows.length;i+=size)out.push(rows.slice(i,i+size));
  return out;
}

async function sendExpo(messages:any[]){
  let accepted=0;
  const errors:string[]=[];
  for(const group of chunks(messages,100)){
    const response=await fetch(EXPO_PUSH_URL,{
      method:'POST',
      headers:{'content-type':'application/json','accept':'application/json','accept-encoding':'gzip, deflate'},
      body:JSON.stringify(group),
      signal:AbortSignal.timeout(10000),
    });
    if(!response.ok){
      errors.push(`HTTP ${response.status}`);
      continue;
    }
    const payload=await response.json() as any;
    const tickets=Array.isArray(payload?.data)?payload.data:[payload?.data].filter(Boolean);
    for(const ticket of tickets){
      if(ticket?.status==='ok')accepted+=1;
      else errors.push(String(ticket?.message||ticket?.details?.error||'push_rejected'));
    }
  }
  return{accepted,errors};
}

export async function sendAttendanceAdminBroadcast(actor:ActorContext,raw:unknown){
  if(!adminRoles.has(actor.role)||!actor.permissions.includes('time.manage')){
    throw new ApiError(403,'Attendance broadcast requires HR administrator time-management permission.','forbidden');
  }
  const input=attendanceBroadcastSchema.parse(raw);
  const db=adminDb();
  const [workersSnap,openSnap,devicesSnap,membershipsSnap,leaveSnap]=await Promise.all([
    db.collection(`organizations/${actor.orgId}/workers`).where('status','==','active').limit(1000).get(),
    db.collection(`organizations/${actor.orgId}/timeEntries`).where('status','==','open').get(),
    db.collection(`organizations/${actor.orgId}/mobileDevices`).where('status','==','active').get(),
    db.collection(`organizations/${actor.orgId}/memberships`).where('status','==','active').get(),
    input.excludeApprovedLeave
      ? db.collection(`organizations/${actor.orgId}/leaveRequests`).where('status','==','approved').get()
      : Promise.resolve(null),
  ]);

  const activeWorkers=workersSnap.docs.map(doc=>doc.data() as Worker);
  const clockedIn=new Set(openSnap.docs.map(doc=>String((doc.data() as TimeEntry).workerId)));
  const today=new Date().toISOString().slice(0,10);
  const onLeave=new Set<string>();
  if(leaveSnap){
    for(const doc of leaveSnap.docs){
      const row=doc.data() as LeaveRequest;
      if(row.startDate<=today&&row.endDate>=today)onLeave.add(row.workerId);
    }
  }

  const scopeMatched=activeWorkers.filter(worker=>{
    if(input.scope==='clocked_in')return clockedIn.has(worker.id);
    if(input.scope==='not_clocked_in')return !clockedIn.has(worker.id);
    return true;
  });
  const excludedApprovedLeaveWorkers=input.excludeApprovedLeave
    ? scopeMatched.filter(worker=>onLeave.has(worker.id)).length
    : 0;
  const targets=scopeMatched.filter(worker=>!(input.excludeApprovedLeave&&onLeave.has(worker.id)));
  const targetIds=new Set(targets.map(worker=>worker.id));

  const devices=devicesSnap.docs
    .map(doc=>doc.data() as MobileDeviceRegistration)
    .filter(row=>Boolean(row.workerId)&&targetIds.has(String(row.workerId))&&row.notificationsGranted===true&&Boolean(validExpoToken(row.pushToken)));
  const tokens=[...new Set(devices.map(row=>validExpoToken(row.pushToken)).filter(Boolean))];

  const title=input.action==='clock_in'?'Clock In reminder':'Clock Out reminder';
  const defaultBody=input.action==='clock_in'
    ? 'Administration is reminding staff to clock in. Open OPSIQO Pulse to record attendance.'
    : 'Administration is reminding staff to clock out. Open OPSIQO Pulse to record attendance.';
  const body=input.message||defaultBody;
  const broadcastId=randomUUID();
  const timestamp=new Date().toISOString();

  const pushMessages=tokens.map(to=>({
    to,
    title,
    body,
    sound:'default',
    channelId:'attendance-reminders-default',
    priority:'high',
    interruptionLevel:'time-sensitive',
    data:{
      kind:'opsiqo_attendance_reminder',
      source:'admin_broadcast',
      action:input.action,
      route:'/time',
      broadcastId,
      sentAt:timestamp,
    },
  }));
  const push=await sendExpo(pushMessages);

  const memberships=membershipsSnap.docs
    .map(doc=>({uid:doc.id,...doc.data()} as any))
    .filter(row=>row.workerId&&targetIds.has(String(row.workerId)));
  let inAppCreated=0;
  for(const group of chunks(memberships,400)){
    const batch=db.batch();
    for(const member of group){
      const id=`attendance-broadcast-${broadcastId}-${member.uid}`;
      batch.create(db.doc(`organizations/${actor.orgId}/notifications/${id}`),{
        id,
        type:'attendance.reminder.broadcast',
        category:'time_attendance',
        priority:'high',
        title,
        message:body,
        targetUid:member.uid,
        entityType:'attendanceBroadcast',
        entityId:broadcastId,
        status:'unread',
        inAppVisible:true,
        emailStatus:'disabled',
        emailAttempts:0,
        createdAt:timestamp,
        updatedAt:timestamp,
      });
      inAppCreated+=1;
    }
    await batch.commit();
  }

  const row={
    id:broadcastId,
    action:input.action,
    scope:input.scope,
    message:body,
    reason:input.reason,
    excludeApprovedLeave:input.excludeApprovedLeave,
    scopeMatchedWorkers:scopeMatched.length,
    excludedApprovedLeaveWorkers,
    targetWorkers:targets.length,
    pushCapableDevices:tokens.length,
    pushAccepted:push.accepted,
    inAppCreated,
    pushErrors:push.errors.slice(0,20),
    createdBy:actor.uid,
    createdAt:timestamp,
  };
  const audit=buildAudit(actor,{
    action:'attendance.reminder.broadcast',
    entityType:'attendanceBroadcast',
    entityId:broadcastId,
    after:row,
  });
  const batch=db.batch();
  batch.create(db.doc(`organizations/${actor.orgId}/attendanceBroadcasts/${broadcastId}`),row);
  batch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);
  await batch.commit();

  return row;
}
