import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { getCustomAgentHistory } from '@/lib/opsiqo-one/agent-builder';

export async function GET(request:Request,context:{params:Promise<{orgId:string;agentId:string}>}){
  try{
    const {orgId,agentId}=await context.params;
    const actor=await actorFromRequest(request,orgId);
    return NextResponse.json({data:await getCustomAgentHistory(actor,agentId)});
  }catch(e){return apiErrorResponse(e)}
}
