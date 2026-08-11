import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { actOnGovernanceException } from '@/lib/governance/service';
export async function PATCH(request:Request,context:{params:Promise<{orgId:string;exceptionId:string}>}){try{const{orgId,exceptionId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'governance.manage');return NextResponse.json({data:await actOnGovernanceException(actor,exceptionId,await request.json())});}catch(e){return apiErrorResponse(e);}}
