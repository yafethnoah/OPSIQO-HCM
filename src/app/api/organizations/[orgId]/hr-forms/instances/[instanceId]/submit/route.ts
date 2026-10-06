import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { submitFormInstance } from '@/lib/hr-forms-workflows/opsiqo-service';
export async function POST(request:Request,context:{params:Promise<{orgId:string;instanceId:string}>}){try{const{orgId,instanceId}=await context.params,a=await actorFromRequest(request,orgId);requirePermission(a,'workflow.run');return NextResponse.json({data:await submitFormInstance(a,instanceId,await request.json())},{status:201});}catch(e){return apiErrorResponse(e);}}
