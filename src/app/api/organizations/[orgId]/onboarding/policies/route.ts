import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { createOnboardingPolicy, listOnboardingPolicies } from '@/lib/onboarding/service';
export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'onboarding.read');return NextResponse.json({data:await listOnboardingPolicies(actor)});}catch(e){return apiErrorResponse(e);}}
export async function POST(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'onboarding.activate');return NextResponse.json({data:await createOnboardingPolicy(actor,await request.json())},{status:201});}catch(e){return apiErrorResponse(e);}}
