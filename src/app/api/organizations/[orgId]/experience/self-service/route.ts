import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { prepareServiceSelfService,resolveServiceSelfService } from '@/lib/experience/self-service';

export async function POST(request:Request,context:{params:Promise<{orgId:string}>}){
  try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);return NextResponse.json({data:await prepareServiceSelfService(actor,await request.json())});}
  catch(error){return apiErrorResponse(error);}
}
export async function PATCH(request:Request,context:{params:Promise<{orgId:string}>}){
  try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);return NextResponse.json({data:await resolveServiceSelfService(actor,await request.json())});}
  catch(error){return apiErrorResponse(error);}
}
