import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { actOnDocument } from '@/lib/compliance/service';
export async function PATCH(request:Request,context:{params:Promise<{orgId:string;documentId:string}>}){try{const{orgId,documentId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'documents.manage');return NextResponse.json({data:await actOnDocument(actor,documentId,await request.json())});}catch(e){return apiErrorResponse(e);}}
