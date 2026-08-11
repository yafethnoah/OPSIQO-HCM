import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { createPrehireCase, listOnboardingCases } from '@/lib/onboarding/service';
export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'onboarding.read');return NextResponse.json({data:await listOnboardingCases(actor)});}catch(e){return apiErrorResponse(e);}}
export async function POST(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'onboarding.manage');return NextResponse.json({data:await createPrehireCase(actor,await request.json())},{status:201});}catch(e){return apiErrorResponse(e);}}
