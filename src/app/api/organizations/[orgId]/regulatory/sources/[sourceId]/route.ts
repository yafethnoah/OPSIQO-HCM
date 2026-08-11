import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { actOnRegulatorySource } from '@/lib/regulatory/service';
export async function PATCH(request:Request,context:{params:Promise<{orgId:string;sourceId:string}>}){try{const{orgId,sourceId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'regulatory.manage');return NextResponse.json({data:await actOnRegulatorySource(actor,sourceId,await request.json())});}catch(e){return apiErrorResponse(e);}}
