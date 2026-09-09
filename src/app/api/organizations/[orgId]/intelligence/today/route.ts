import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import type { TodayPersona } from '@/domain/intelligence-control-plane';
import { roleTodayDashboard } from '@/lib/intelligence-control-plane/today-engine';
const personas=new Set<TodayPersona>(['hr','manager','employee','recruiter','executive','it_identity']);
export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params,actor=await actorFromRequest(request,orgId),value=new URL(request.url).searchParams.get('persona') as TodayPersona|null,persona=value&&personas.has(value)?value:undefined;return NextResponse.json({data:await roleTodayDashboard(actor,persona)});}catch(e){return apiErrorResponse(e)}}
