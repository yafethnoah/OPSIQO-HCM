import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { acknowledgePolicy } from '@/lib/compliance/service';
export async function POST(request:Request,context:{params:Promise<{orgId:string;policyId:string}>}){try{const{orgId,policyId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'policies.read');return NextResponse.json({data:await acknowledgePolicy(actor,policyId,await request.json())});}catch(e){return apiErrorResponse(e);}}
