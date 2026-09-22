import { createHash, randomUUID } from 'crypto';
import type { MobileDeviceRegistration } from '@/domain/mobile';
import type { ShiftAssignment, TimeEntry } from '@/domain/time';
import { adminDb } from '@/lib/firebase/admin';

const nowIso=()=>new Date().toISOString();
const MAX_SHIFTS=5000;
const LOCK_MS=2*60*1000;
const MAX_ATTEMPTS=4;
const EXPO_PUSH_URL='https://exp.host/--/api/v2/push/send';

export type AttendanceServerReminderStage='clock_in_due'|'clock_in_late'|'clock_out_due'|'clock_out_late';

export type AttendanceServerReminderDecision={
  stage:AttendanceServerReminderStage;
  action:'clock_in'|'clock_out';
  title:string;
  body:string;
  scheduledAt:string;
};

function within(now:number,target:number,windowMs=2*60*1000){
  return now>=target&&now<target+windowMs;
}

function overlapsShift(entry:TimeEntry,shift:ShiftAssignment){
  const shiftStart=Date.parse(shift.startAt),shiftEnd=Date.parse(shift.endAt);
  const entryStart=Date.parse(entry.startAt),entryEnd=entry.endAt?Date.parse(entry.endAt):Number.POSITIVE_INFINITY;
  return Number.isFinite(entryStart)&&entryStart<=shiftEnd&&entryEnd>=shiftStart-4*60*60*1000;
}

export function attendanceServerReminderDecisions(
  shift:ShiftAssignment,
  entries:TimeEntry[],
  nowMs=Date.now(),
):AttendanceServerReminderDecision[]{
  if(shift.status!=='published')return[];
  const start=Date.parse(shift.startAt),end=Date.parse(shift.endAt);
  if(!Number.isFinite(start)||!Number.isFinite(end))return[];

  const relevant=entries.filter(entry=>overlapsShift(entry,shift));
  const hasClockedIn=relevant.some(entry=>Date.parse(entry.startAt)<=nowMs);
  const hasOpenEntry=relevant.some(entry=>entry.status==='open'&&!entry.endAt);

  const rows:AttendanceServerReminderDecision[]=[];

  if(!hasClockedIn&&within(nowMs,start)){
    rows.push({
      stage:'clock_in_due',
      action:'clock_in',
      title:'Time to clock in',
      body:`${shift.title||'Your shift'} is starting. Open OPSIQO Pulse to clock in.`,
      scheduledAt:new Date(start).toISOString(),
    });
  }
  if(!hasClockedIn&&within(nowMs,start+5*60*1000)){
    rows.push({
      stage:'clock_in_late',
      action:'clock_in',
      title:"Clock In reminder",
      body:"You still appear not to be clocked in for your scheduled shift. Open OPSIQO Pulse to clock in.",
      scheduledAt:new Date(start+5*60*1000).toISOString(),
    });
  }
  if(hasOpenEntry&&within(nowMs,end)){
    rows.push({
      stage:'clock_out_due',
      action:'clock_out',
      title:'Time to clock out',
      body:`${shift.title||'Your shift'} is scheduled to end. Open OPSIQO Pulse to clock out.`,
      scheduledAt:new Date(end).toISOString(),
    });
  }
  if(hasOpenEntry&&within(nowMs,end+10*60*1000)){
    rows.push({
      stage:'clock_out_late',
      action:'clock_out',
      title:"Clock Out reminder",
      body:"Your scheduled shift has ended and you still appear clocked in. Open OPSIQO Pulse to clock out.",
      scheduledAt:new Date(end+10*60*1000).toISOString(),
    });
  }
  return rows;
}

function deliveryId(workerId:string,shiftId:string,stage:AttendanceServerReminderStage){
  return createHash('sha256').update(`${workerId}|${shiftId}|${stage}`).digest('hex').slice(0,48);
}

function validExpoToken(value:unknown){
  const token=String(value||'').trim();
  return /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(token)?token:'';
}

async function workerEntries(orgId:string,workerId:string){
  const snap=await adminDb().collection(`organizations/${orgId}/timeEntries`).where('workerId','==',workerId).get();
  return snap.docs.map(doc=>doc.data() as TimeEntry);
}

async function workerDevices(orgId:string,workerId:string){
  const snap=await adminDb().collection(`organizations/${orgId}/mobileDevices`).where('workerId','==',workerId).get();
  return snap.docs
    .map(doc=>doc.data() as MobileDeviceRegistration)
    .filter(row=>row.status==='active'&&row.notificationsGranted===true&&Boolean(validExpoToken(row.pushToken)));
}

async function targetUid(orgId:string,workerId:string){
  const snap=await adminDb().collection(`organizations/${orgId}/memberships`)
    .where('workerId','==',workerId).where('status','==','active').limit(1).get();
  return snap.empty?undefined:snap.docs[0]!.id;
}

async function claimDelivery(orgId:string,shift:ShiftAssignment,decision:AttendanceServerReminderDecision){
  const db=adminDb();
  const id=deliveryId(shift.workerId,shift.id,decision.stage);
  const ref=db.doc(`organizations/${orgId}/attendanceReminderDeliveries/${id}`);
  const timestamp=nowIso();
  return db.runTransaction(async tx=>{
    const snap=await tx.get(ref);
    const prior=snap.exists?snap.data() as any:null;
    if(prior?.status==='sent'||prior?.status==='no_push_device')return{claimed:false,id,ref};
    const attempts=Number(prior?.attempts||0);
    if(attempts>=MAX_ATTEMPTS)return{claimed:false,id,ref};
    if(prior?.status==='sending'&&Date.now()-Date.parse(String(prior.updatedAt||prior.createdAt||0))<LOCK_MS)return{claimed:false,id,ref};
    tx.set(ref,{
      id,
      workerId:shift.workerId,
      shiftId:shift.id,
      stage:decision.stage,
      action:decision.action,
      scheduledAt:decision.scheduledAt,
      status:'sending',
      attempts:attempts+1,
      createdAt:prior?.createdAt||timestamp,
      updatedAt:timestamp,
    },{merge:true});
    return{claimed:true,id,ref};
  });
}

async function createInAppReminder(orgId:string,uid:string|undefined,shift:ShiftAssignment,decision:AttendanceServerReminderDecision,deliveryIdValue:string){
  if(!uid)return;
  const id=`attendance-${deliveryIdValue}`;
  const ref=adminDb().doc(`organizations/${orgId}/notifications/${id}`);
  const snap=await ref.get();
  if(snap.exists)return;
  const timestamp=nowIso();
  await ref.create({
    id,
    type:'attendance.reminder',
    category:'time_attendance',
    priority:decision.stage.endsWith('_late')?'high':'normal',
    title:decision.title,
    message:decision.body,
    targetUid:uid,
    entityType:'shiftAssignment',
    entityId:shift.id,
    status:'unread',
    inAppVisible:true,
    emailStatus:'disabled',
    emailAttempts:0,
    createdAt:timestamp,
    updatedAt:timestamp,
  });
}

async function sendExpoPush(tokens:string[],shift:ShiftAssignment,decision:AttendanceServerReminderDecision){
  if(tokens.length===0)return{accepted:0,errors:[] as string[]};
  const messages=tokens.map(to=>({
    to,
    title:decision.title,
    body:decision.body,
    sound:'default',
    channelId:'attendance-reminders-default',
    priority:'high',
    interruptionLevel:'time-sensitive',
    data:{
      kind:'opsiqo_attendance_reminder',
      source:'server_backup',
      action:decision.action,
      stage:decision.stage,
      shiftId:shift.id,
      route:'/time',
      scheduledAt:decision.scheduledAt,
    },
  }));
  const response=await fetch(EXPO_PUSH_URL,{
    method:'POST',
    headers:{'content-type':'application/json','accept':'application/json','accept-encoding':'gzip, deflate'},
    body:JSON.stringify(messages),
    signal:AbortSignal.timeout(10000),
  });
  if(!response.ok)throw new Error(`Expo push request failed with HTTP ${response.status}.`);
  const payload=await response.json() as any;
  const tickets=Array.isArray(payload?.data)?payload.data:[payload?.data].filter(Boolean);
  const errors:string[]=[];
  let accepted=0;
  for(const ticket of tickets){
    if(ticket?.status==='ok')accepted+=1;
    else errors.push(String(ticket?.message||ticket?.details?.error||'push_rejected'));
  }
  return{accepted,errors};
}

async function deliverDecision(orgId:string,shift:ShiftAssignment,decision:AttendanceServerReminderDecision){
  const claim=await claimDelivery(orgId,shift,decision);
  if(!claim.claimed)return{stage:decision.stage,status:'deduplicated' as const,pushAccepted:0};

  const db=adminDb();
  const [devices,uid]=await Promise.all([workerDevices(orgId,shift.workerId),targetUid(orgId,shift.workerId)]);
  await createInAppReminder(orgId,uid,shift,decision,claim.id);

  const tokens=[...new Set(devices.map(device=>validExpoToken(device.pushToken)).filter(Boolean))];
  if(tokens.length===0){
    await claim.ref.set({status:'no_push_device',pushAccepted:0,pushDeviceCount:0,completedAt:nowIso(),updatedAt:nowIso()},{merge:true});
    return{stage:decision.stage,status:'no_push_device' as const,pushAccepted:0};
  }

  try{
    const sent=await sendExpoPush(tokens,shift,decision);
    const status=sent.accepted>0?'sent':'failed';
    await claim.ref.set({
      status,
      pushAccepted:sent.accepted,
      pushDeviceCount:tokens.length,
      pushErrors:sent.errors.slice(0,10),
      completedAt:status==='sent'?nowIso():undefined,
      updatedAt:nowIso(),
    },{merge:true});
    return{stage:decision.stage,status,pushAccepted:sent.accepted};
  }catch(error){
    await claim.ref.set({
      status:'failed',
      lastError:(error instanceof Error?error.message:'Push delivery failed').slice(0,500),
      updatedAt:nowIso(),
    },{merge:true});
    return{stage:decision.stage,status:'failed' as const,pushAccepted:0};
  }
}

export async function processAttendanceServerReminders(orgId:string,nowMs=Date.now()){
  const db=adminDb();
  const shiftsSnap=await db.collection(`organizations/${orgId}/shiftAssignments`).where('status','==','published').limit(MAX_SHIFTS).get();
  const shifts=shiftsSnap.docs.map(doc=>doc.data() as ShiftAssignment);
  const windowStart=nowMs-15*60*1000;
  const windowEnd=nowMs+2*60*1000;
  const candidates=shifts.filter(shift=>{
    const start=Date.parse(shift.startAt),end=Date.parse(shift.endAt);
    return (Number.isFinite(start)&&start>=windowStart&&start<=windowEnd)||
      (Number.isFinite(end)&&end>=windowStart&&end<=windowEnd);
  });

  const entriesByWorker=new Map<string,TimeEntry[]>();
  let evaluated=0,reminders=0,pushAccepted=0,deduplicated=0,noPushDevice=0,failed=0;

  for(const shift of candidates){
    let entries=entriesByWorker.get(shift.workerId);
    if(!entries){
      entries=await workerEntries(orgId,shift.workerId);
      entriesByWorker.set(shift.workerId,entries);
    }
    const decisions=attendanceServerReminderDecisions(shift,entries,nowMs);
    evaluated+=1;
    for(const decision of decisions){
      reminders+=1;
      const result=await deliverDecision(orgId,shift,decision);
      pushAccepted+=result.pushAccepted;
      if(result.status==='deduplicated')deduplicated+=1;
      if(result.status==='no_push_device')noPushDevice+=1;
      if(result.status==='failed')failed+=1;
    }
  }

  return{
    scanned:shifts.length,
    candidates:candidates.length,
    evaluated,
    reminders,
    pushAccepted,
    deduplicated,
    noPushDevice,
    failed,
    generatedAt:new Date(nowMs).toISOString(),
  };
}
