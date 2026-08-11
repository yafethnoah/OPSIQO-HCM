import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { actOnGovernanceRisk } from '@/lib/governance/service';
export async function PATCH(request:Request,context:{params:Promise<{orgId:string;riskId:string}>}){try{const{orgId,riskId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'governance.manage');return NextResponse.json({data:await actOnGovernanceRisk(actor,riskId,await request.json())});}catch(e){return apiErrorResponse(e);}}
