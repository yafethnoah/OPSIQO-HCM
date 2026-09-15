import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { actCompensationChangeRequest, compensationOperationsIntelligence, createCompensationChangeRequest } from '@/lib/compensation/operations-intelligence-service';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store, max-age=0'};

export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){
  try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);return NextResponse.json({data:await compensationOperationsIntelligence(actor)},{headers});}
  catch(e){const r=apiErrorResponse(e);r.headers.set('Cache-Control',headers['Cache-Control']);return r;}
}
export async function POST(request:Request,context:{params:Promise<{orgId:string}>}){
  try{
    const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);const body=await request.json() as any;
    let data:any;
    if(body.action==='create_change')data=await createCompensationChangeRequest(actor,body.input);
    else if(body.action==='change_action')data=await actCompensationChangeRequest(actor,String(body.id||''),String(body.operation||''),body.note);
    else return NextResponse.json({error:'Unsupported compensation intelligence action.',code:'invalid_action'},{status:400,headers});
    return NextResponse.json({data},{headers});
  }catch(e){const r=apiErrorResponse(e);r.headers.set('Cache-Control',headers['Cache-Control']);return r;}
}