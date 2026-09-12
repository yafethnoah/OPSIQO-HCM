import{NextResponse}from'next/server';
import{actorFromRequest,requirePermission}from'@/lib/auth/session';
import{apiErrorResponse}from'@/lib/http/errors';
import{applySuggestedBand,getCompensationReadiness,prepareCompensationDrafts,preparePayrollProfileDrafts}from'@/lib/compensation/readiness';

export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){
  try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'compensation.read');return NextResponse.json({data:await getCompensationReadiness(actor)});}
  catch(e){return apiErrorResponse(e);}
}
export async function POST(request:Request,context:{params:Promise<{orgId:string}>}){
  try{
    const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);const body=await request.json();
    if(body.action==='prepare_compensation_drafts')return NextResponse.json({data:await prepareCompensationDrafts(actor)});
    if(body.action==='prepare_payroll_drafts')return NextResponse.json({data:await preparePayrollProfileDrafts(actor)});
    if(body.action==='apply_band_mapping')return NextResponse.json({data:await applySuggestedBand(actor,String(body.workerId||''),String(body.bandId||''))});
    return NextResponse.json({error:'Unsupported readiness action.',code:'invalid_action'},{status:400});
  }catch(e){return apiErrorResponse(e);}
}