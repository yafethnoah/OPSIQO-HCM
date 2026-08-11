import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { actOnAssuranceEvidence } from '@/lib/assurance/service';
export async function PATCH(request:Request,context:{params:Promise<{orgId:string;evidenceId:string}>}){try{const{orgId,evidenceId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'assurance.manage');return NextResponse.json({data:await actOnAssuranceEvidence(actor,evidenceId,await request.json())});}catch(e){return apiErrorResponse(e);}}
