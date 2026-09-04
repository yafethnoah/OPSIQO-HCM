import { NextResponse } from 'next/server';
import { actorFromRequest,requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { careerGps } from '@/lib/opsiqo-one/career-gps';
const NO_STORE='private, no-store, max-age=0';export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'career.read');const targetPositionId=new URL(request.url).searchParams.get('targetPositionId')||undefined;return NextResponse.json({data:await careerGps(actor,targetPositionId)},{headers:{'Cache-Control':NO_STORE}})}catch(e){const r=apiErrorResponse(e);r.headers.set('Cache-Control',NO_STORE);return r}}
