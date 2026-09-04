import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { confirmContractImport } from '@/lib/contract-import/service';
const NO_STORE='private, no-store, max-age=0';
function noStoreError(e:unknown){const r=apiErrorResponse(e);r.headers.set('Cache-Control',NO_STORE);return r}
export const dynamic='force-dynamic';
export async function POST(request:Request,context:{params:Promise<{orgId:string;draftId:string}>}){try{const{orgId,draftId}=await context.params,actor=await actorFromRequest(request,orgId),data=await confirmContractImport(actor,draftId,await request.json());return NextResponse.json({data},{headers:{'Cache-Control':NO_STORE}})}catch(e){return noStoreError(e)}}
