import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { actShift } from '@/lib/time/frontline-service';
export async function PATCH(request:Request,context:{params:Promise<{orgId:string;shiftId:string}>}){try{const{orgId,shiftId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'time.manage');return NextResponse.json({data:await actShift(actor,shiftId,await request.json())});}catch(e){return apiErrorResponse(e);}}
