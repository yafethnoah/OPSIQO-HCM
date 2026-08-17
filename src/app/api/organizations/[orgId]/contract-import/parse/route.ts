import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { MAX_CONTRACT_BYTES } from '@/lib/contract-import/schemas';
import { parseContractImport } from '@/lib/contract-import/service';

const NO_STORE='private, no-store, max-age=0';
function noStoreError(e:unknown){const r=apiErrorResponse(e);r.headers.set('Cache-Control',NO_STORE);return r}
export const dynamic='force-dynamic';
export async function POST(request:Request,context:{params:Promise<{orgId:string}>}){
 try{
  const{orgId}=await context.params,actor=await actorFromRequest(request,orgId),form=await request.formData(),entry=form.get('file');
  if(!(entry instanceof File))return NextResponse.json({message:'Choose a contract file.'},{status:400,headers:{'Cache-Control':NO_STORE}});
  if(entry.size>MAX_CONTRACT_BYTES)return NextResponse.json({message:'Contract file exceeds the 10 MB import limit.'},{status:413,headers:{'Cache-Control':NO_STORE}});
  const bytes=Buffer.from(await entry.arrayBuffer()),data=await parseContractImport(actor,{name:entry.name,mimeType:entry.type||'application/octet-stream',bytes});
  return NextResponse.json({data},{headers:{'Cache-Control':NO_STORE}});
 }catch(e){return noStoreError(e)}
}
