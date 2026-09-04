import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { aiValueDashboard } from '@/lib/opsiqo-one/ai-value';
const NO_STORE='private, no-store, max-age=0';export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);const raw=Number(new URL(request.url).searchParams.get('days')||30);return NextResponse.json({data:await aiValueDashboard(actor,raw)},{headers:{'Cache-Control':NO_STORE}})}catch(e){const r=apiErrorResponse(e);r.headers.set('Cache-Control',NO_STORE);return r}}
