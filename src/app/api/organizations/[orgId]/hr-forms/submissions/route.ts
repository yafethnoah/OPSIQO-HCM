import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { listFormSubmissions } from '@/lib/hr-forms-workflows/opsiqo-service';
export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params,a=await actorFromRequest(request,orgId);requirePermission(a,'workflow.read');return NextResponse.json({data:await listFormSubmissions(a)});}catch(e){return apiErrorResponse(e);}}
