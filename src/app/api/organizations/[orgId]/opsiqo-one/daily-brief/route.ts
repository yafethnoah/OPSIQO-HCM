import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { buildDailyBrief } from '@/lib/opsiqo-one/daily-brief';
const NO_STORE='private, no-store, max-age=0';export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params,actor=await actorFromRequest(request,orgId);requirePermission(actor,'self.read');return NextResponse.json({data:await buildDailyBrief(actor)},{headers:{'Cache-Control':NO_STORE}})}catch(e){const r=apiErrorResponse(e);r.headers.set('Cache-Control',NO_STORE);return r}}
