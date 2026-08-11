import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { actOnPolicy, getPolicy } from '@/lib/compliance/service';
export async function GET(request:Request,context:{params:Promise<{orgId:string;policyId:string}>}){try{const{orgId,policyId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'policies.read');return NextResponse.json({data:await getPolicy(actor,policyId)});}catch(e){return apiErrorResponse(e);}}
export async function PATCH(request:Request,context:{params:Promise<{orgId:string;policyId:string}>}){try{const{orgId,policyId}=await context.params;const actor=await actorFromRequest(request,orgId);const body=await request.json();if(body.action==='approve'||body.action==='publish'||body.action==='archive')requirePermission(actor,'policies.approve');else requirePermission(actor,'policies.manage');return NextResponse.json({data:await actOnPolicy(actor,policyId,body)});}catch(e){return apiErrorResponse(e);}}
