import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { bootstrapGovernanceControlCenter } from '@/lib/governance/service';
export async function POST(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'governance.approve');return NextResponse.json({data:await bootstrapGovernanceControlCenter(actor)});}catch(e){return apiErrorResponse(e);}}
