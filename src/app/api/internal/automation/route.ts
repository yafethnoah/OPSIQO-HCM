import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { listAutomationOrganizationIds, runPhase1Automation } from '@/lib/automation/service';
import { apiErrorResponse, ApiError } from '@/lib/http/errors';

const bodySchema = z.object({
  orgId: z.string().min(1).max(180).optional(),
  scope: z.enum(['organization','all']).default('organization'),
}).superRefine((value,ctx)=>{
  if(value.scope==='organization'&&!value.orgId)ctx.addIssue({code:'custom',message:'orgId is required for organization scope.'});
});

function authorized(request: Request) {
  const expected = process.env.OPSIQO_JOB_SECRET;
  if (!expected) throw new ApiError(503, 'OPSIQO_JOB_SECRET is not configured.', 'job_secret_missing');
  const supplied = request.headers.get('x-opsiqo-job-secret') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  try {
    if (!authorized(request)) throw new ApiError(401, 'Invalid automation job secret.', 'invalid_job_secret');
    const input = bodySchema.parse(await request.json());
    if(input.scope==='organization'){
      return NextResponse.json({ data: await runPhase1Automation(input.orgId!, 'system:trusted-scheduler') });
    }
    const orgIds=await listAutomationOrganizationIds();
    const results=[] as Array<{orgId:string;status:'completed'|'partial'|'failed';failedLanes:number;runId?:string;error?:string}>;
    for(const orgId of orgIds){
      try{
        const summary=await runPhase1Automation(orgId,'system:trusted-scheduler:all-organizations');
        results.push({orgId,status:summary.coverage.failedLanes?'partial':'completed',failedLanes:summary.coverage.failedLanes,runId:summary.runId});
      }catch(error){
        results.push({orgId,status:'failed',failedLanes:1,error:(error instanceof Error?error.message:'Automation failed').slice(0,500)});
      }
    }
    return NextResponse.json({data:{scope:'all',organizations:results.length,completed:results.filter(x=>x.status==='completed').length,partial:results.filter(x=>x.status==='partial').length,failed:results.filter(x=>x.status==='failed').length,results}});
  } catch (error) {
    return apiErrorResponse(error);
  }
}
