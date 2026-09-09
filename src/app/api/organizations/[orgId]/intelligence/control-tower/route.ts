import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { aiControlTower } from '@/lib/intelligence-control-plane/control-tower';
export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params,actor=await actorFromRequest(request,orgId);return NextResponse.json({data:await aiControlTower(actor)});}catch(e){return apiErrorResponse(e)}}
