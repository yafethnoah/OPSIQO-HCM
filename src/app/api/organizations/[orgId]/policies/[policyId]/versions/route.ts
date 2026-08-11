import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { createPolicyVersion } from '@/lib/compliance/service';
export async function POST(request:Request,context:{params:Promise<{orgId:string;policyId:string}>}){try{const{orgId,policyId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'policies.manage');return NextResponse.json({data:await createPolicyVersion(actor,policyId,await request.json())},{status:201});}catch(e){return apiErrorResponse(e);}}
