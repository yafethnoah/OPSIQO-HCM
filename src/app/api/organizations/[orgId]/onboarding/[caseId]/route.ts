import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { actOnOnboardingCase, getOnboardingCase } from '@/lib/onboarding/service';
export async function GET(request:Request,context:{params:Promise<{orgId:string;caseId:string}>}){try{const{orgId,caseId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'onboarding.read');return NextResponse.json({data:await getOnboardingCase(actor,caseId)});}catch(e){return apiErrorResponse(e);}}
export async function PATCH(request:Request,context:{params:Promise<{orgId:string;caseId:string}>}){try{const{orgId,caseId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'onboarding.manage');return NextResponse.json({data:await actOnOnboardingCase(actor,caseId,await request.json())});}catch(e){return apiErrorResponse(e);}}
