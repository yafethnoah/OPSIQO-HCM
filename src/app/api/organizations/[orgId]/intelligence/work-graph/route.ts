import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { queryWorkGraph,upsertWorkGraphRelationship } from '@/lib/intelligence-control-plane/work-graph';
export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params,actor=await actorFromRequest(request,orgId),q=new URL(request.url).searchParams;return NextResponse.json({data:await queryWorkGraph(actor,{objectType:q.get('objectType')||undefined,objectId:q.get('objectId')||undefined,relation:q.get('relation')||undefined,limit:Number(q.get('limit')||100)})});}catch(e){return apiErrorResponse(e)}}
export async function POST(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params,actor=await actorFromRequest(request,orgId),body=await request.json();return NextResponse.json({data:await upsertWorkGraphRelationship(actor,body)});}catch(e){return apiErrorResponse(e)}}
