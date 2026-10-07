import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { createExperienceActionPlan } from '@/lib/experience/intelligence';

export async function POST(request:Request,context:{params:Promise<{orgId:string}>}){
  try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);return NextResponse.json({data:await createExperienceActionPlan(actor,await request.json())},{status:201});}
  catch(error){return apiErrorResponse(error);}
}
