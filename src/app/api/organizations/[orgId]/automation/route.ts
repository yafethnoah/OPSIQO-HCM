import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { listAutomationRuns, runPhase1Automation } from '@/lib/automation/service';

export async function GET(request: Request, context: {params: Promise<{orgId:string}>}) {
  try {
    const {orgId}=await context.params; const actor=await actorFromRequest(request,orgId); requirePermission(actor,'automation.read');
    const url=new URL(request.url); return NextResponse.json({data:await listAutomationRuns(orgId,Number(url.searchParams.get('limit')||30))});
  } catch(error){ return apiErrorResponse(error); }
}
export async function POST(request: Request, context: {params: Promise<{orgId:string}>}) {
  try {
    const {orgId}=await context.params; const actor=await actorFromRequest(request,orgId); requirePermission(actor,'automation.run');
    return NextResponse.json({data:await runPhase1Automation(orgId, actor.uid)});
  } catch(error){ return apiErrorResponse(error); }
}
