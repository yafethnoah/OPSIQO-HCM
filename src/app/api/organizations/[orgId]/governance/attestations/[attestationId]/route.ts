import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { actOnGovernanceAttestation } from '@/lib/governance/service';
export async function PATCH(request:Request,context:{params:Promise<{orgId:string;attestationId:string}>}){try{const{orgId,attestationId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'governance.manage');return NextResponse.json({data:await actOnGovernanceAttestation(actor,attestationId,await request.json())});}catch(e){return apiErrorResponse(e);}}
