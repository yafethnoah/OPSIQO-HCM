import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { generateFormWithAi } from '@/lib/hr-forms-workflows/opsiqo-service';
export async function POST(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params,a=await actorFromRequest(request,orgId);requirePermission(a,'workflow.manage');requirePermission(a,'ai.use');return NextResponse.json({data:await generateFormWithAi(a,await request.json())},{status:201});}catch(e){return apiErrorResponse(e);}}
