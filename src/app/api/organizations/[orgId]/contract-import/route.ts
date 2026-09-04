import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { listContractImports } from '@/lib/contract-import/service';
const NO_STORE='private, no-store, max-age=0';
function noStoreError(e:unknown){const r=apiErrorResponse(e);r.headers.set('Cache-Control',NO_STORE);return r}
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params,actor=await actorFromRequest(request,orgId);return NextResponse.json({data:await listContractImports(actor)},{headers:{'Cache-Control':NO_STORE}})}catch(e){return noStoreError(e)}}
