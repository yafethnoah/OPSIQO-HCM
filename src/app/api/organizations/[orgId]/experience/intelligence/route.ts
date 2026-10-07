import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { experienceIntelligenceDashboard,generateExperienceIntelligence } from '@/lib/experience/intelligence';

export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){
  try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);return NextResponse.json({data:await experienceIntelligenceDashboard(actor)});}
  catch(error){return apiErrorResponse(error);}
}
export async function POST(request:Request,context:{params:Promise<{orgId:string}>}){
  try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);return NextResponse.json({data:await generateExperienceIntelligence(actor)});}
  catch(error){return apiErrorResponse(error);}
}
