import { NextResponse } from 'next/server';
import { actorFromRequest,requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { saveAgentPolicy } from '@/lib/opsiqo-one/agent-governance';
const NO_STORE='private, no-store, max-age=0';export const dynamic='force-dynamic';
export async function PATCH(request:Request,context:{params:Promise<{orgId:string;agentId:string}>}){try{const{orgId,agentId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'ai.manage');return NextResponse.json({data:await saveAgentPolicy(actor,agentId,await request.json())},{headers:{'Cache-Control':NO_STORE}})}catch(e){const r=apiErrorResponse(e);r.headers.set('Cache-Control',NO_STORE);return r}}
