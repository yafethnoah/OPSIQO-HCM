import { NextResponse } from 'next/server';
import { actorFromRequest,requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { setWorkflowEnabled } from '@/lib/workflow/service';
export async function POST(request:Request,context:{params:Promise<{orgId:string;workflowId:string}>}){try{const{orgId,workflowId}=await context.params,actor=await actorFromRequest(request,orgId);requirePermission(actor,'workflow.manage');const body=await request.json();if(body?.action!=='enable'&&body?.action!=='disable')return NextResponse.json({error:'Invalid workflow action.'},{status:400});return NextResponse.json({data:await setWorkflowEnabled(actor,workflowId,body.action==='enable')});}catch(e){return apiErrorResponse(e)}}
