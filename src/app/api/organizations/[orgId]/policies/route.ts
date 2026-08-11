import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { createPolicy, listPolicies, myPolicyAcknowledgements } from '@/lib/compliance/service';
export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'policies.read');return NextResponse.json({data:await listPolicies(actor),acknowledgements:await myPolicyAcknowledgements(actor)});}catch(e){return apiErrorResponse(e);}}
export async function POST(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'policies.manage');return NextResponse.json({data:await createPolicy(actor,await request.json())},{status:201});}catch(e){return apiErrorResponse(e);}}
