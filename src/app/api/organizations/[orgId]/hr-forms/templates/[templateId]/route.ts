import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { actOnFormTemplate, getFormTemplate } from '@/lib/hr-forms-workflows/opsiqo-service';
export async function GET(request:Request,context:{params:Promise<{orgId:string;templateId:string}>}){try{const{orgId,templateId}=await context.params,a=await actorFromRequest(request,orgId);requirePermission(a,'workflow.read');return NextResponse.json({data:await getFormTemplate(a,templateId)});}catch(e){return apiErrorResponse(e);}}
export async function PATCH(request:Request,context:{params:Promise<{orgId:string;templateId:string}>}){try{const{orgId,templateId}=await context.params,a=await actorFromRequest(request,orgId);requirePermission(a,'workflow.manage');return NextResponse.json({data:await actOnFormTemplate(a,templateId,await request.json())});}catch(e){return apiErrorResponse(e);}}
