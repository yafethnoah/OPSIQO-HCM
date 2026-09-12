import{NextResponse}from'next/server';
import{actorFromRequest}from'@/lib/auth/session';
import{apiErrorResponse}from'@/lib/http/errors';
import{getPayrollReadiness,preparePayrollReadinessDrafts}from'@/lib/payroll/readiness';

export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){
  try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);return NextResponse.json({data:await getPayrollReadiness(actor)});}
  catch(e){return apiErrorResponse(e);}
}
export async function POST(request:Request,context:{params:Promise<{orgId:string}>}){
  try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);const body=await request.json();if(body.action!=='prepare_drafts')return NextResponse.json({error:'Unsupported readiness action.',code:'invalid_action'},{status:400});return NextResponse.json({data:await preparePayrollReadinessDrafts(actor)});}
  catch(e){return apiErrorResponse(e);}
}