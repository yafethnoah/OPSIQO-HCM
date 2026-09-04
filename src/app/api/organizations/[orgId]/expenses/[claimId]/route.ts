import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { actExpenseClaim } from '@/lib/time/frontline-service';
export async function PATCH(request:Request,context:{params:Promise<{orgId:string;claimId:string}>}){try{const{orgId,claimId}=await context.params;const actor=await actorFromRequest(request,orgId);return NextResponse.json({data:await actExpenseClaim(actor,claimId,await request.json())});}catch(e){return apiErrorResponse(e);}}
