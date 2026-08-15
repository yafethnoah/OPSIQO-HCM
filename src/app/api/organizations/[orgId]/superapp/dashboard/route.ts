import { NextResponse } from 'next/server';import { actorFromRequest,requirePermission } from '@/lib/auth/session';import { apiErrorResponse } from '@/lib/http/errors';import { superAppDashboard } from '@/lib/superapp/service';
const NO_STORE='private, no-store, max-age=0';
function noStoreError(e:unknown){const r=apiErrorResponse(e);r.headers.set('Cache-Control',NO_STORE);return r}
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'self.read');return NextResponse.json({data:await superAppDashboard(actor)},{headers:{'Cache-Control':NO_STORE}})}catch(e){return noStoreError(e)}}
