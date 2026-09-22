import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { listAutomationOrganizationIds } from '@/lib/automation/service';
import { processAttendanceServerReminders } from '@/lib/time/attendance-reminder-server';

function authorized(request:Request){
  const expected=String(process.env.OPSIQO_JOB_SECRET||'');
  const supplied=String(request.headers.get('x-opsiqo-job-secret')||'');
  if(!expected||!supplied)return false;
  const a=Buffer.from(expected),b=Buffer.from(supplied);
  return a.length===b.length&&timingSafeEqual(a,b);
}

export async function POST(request:Request){
  if(!authorized(request))return NextResponse.json({error:'Unauthorized'},{status:401});
  const orgIds=await listAutomationOrganizationIds();
  const rows=[] as Array<Record<string,unknown>>;
  for(const orgId of orgIds){
    try{
      rows.push({orgId,...await processAttendanceServerReminders(orgId)});
    }catch(error){
      rows.push({orgId,failed:1,error:error instanceof Error?error.message:'Attendance reminder processing failed'});
    }
  }
  return NextResponse.json({data:{organizations:rows.length,rows,processedAt:new Date().toISOString()}});
}
