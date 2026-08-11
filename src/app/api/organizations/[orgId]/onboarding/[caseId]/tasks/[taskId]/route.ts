import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { actOnOnboardingTask } from '@/lib/onboarding/service';
export async function PATCH(request:Request,context:{params:Promise<{orgId:string;caseId:string;taskId:string}>}){try{const{orgId,caseId,taskId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'onboarding.manage');return NextResponse.json({data:await actOnOnboardingTask(actor,caseId,taskId,await request.json())});}catch(e){return apiErrorResponse(e);}}
