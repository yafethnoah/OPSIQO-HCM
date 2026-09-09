import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { listNextBestActions,refreshNextBestActions } from '@/lib/intelligence-control-plane/next-best-action';
export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params,actor=await actorFromRequest(request,orgId),url=new URL(request.url),limit=Number(url.searchParams.get('limit')||50);return NextResponse.json({data:await listNextBestActions(actor,{limit})});}catch(e){return apiErrorResponse(e)}}
export async function POST(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params,actor=await actorFromRequest(request,orgId);return NextResponse.json({data:await refreshNextBestActions(actor)});}catch(e){return apiErrorResponse(e)}}
