import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { actOnRegulatoryChange } from '@/lib/regulatory/service';
export async function PATCH(request:Request,context:{params:Promise<{orgId:string;changeId:string}>}){try{const{orgId,changeId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'regulatory.manage');return NextResponse.json({data:await actOnRegulatoryChange(actor,changeId,await request.json())});}catch(e){return apiErrorResponse(e);}}
