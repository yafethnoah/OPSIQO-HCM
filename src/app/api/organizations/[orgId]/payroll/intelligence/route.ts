import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import {
  actRetroCase, actVariablePay, createRetroCase, createSpecialPayrollRun, createVariablePay,
  payrollOperationsIntelligence, savePayrollCalendarRule,
} from '@/lib/payroll/operations-intelligence-service';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store, max-age=0'};

export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){
  try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);return NextResponse.json({data:await payrollOperationsIntelligence(actor)},{headers});}
  catch(e){const r=apiErrorResponse(e);r.headers.set('Cache-Control',headers['Cache-Control']);return r;}
}
export async function POST(request:Request,context:{params:Promise<{orgId:string}>}){
  try{
    const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);const body=await request.json() as any;
    let data:any;
    if(body.action==='save_calendar')data=await savePayrollCalendarRule(actor,body.input);
    else if(body.action==='create_retro')data=await createRetroCase(actor,body.input);
    else if(body.action==='retro_action')data=await actRetroCase(actor,String(body.id||''),String(body.operation||''),body.note);
    else if(body.action==='create_variable_pay')data=await createVariablePay(actor,body.input);
    else if(body.action==='variable_action')data=await actVariablePay(actor,String(body.id||''),String(body.operation||''),body.note);
    else if(body.action==='create_special_run')data=await createSpecialPayrollRun(actor,body.input);
    else return NextResponse.json({error:'Unsupported payroll intelligence action.',code:'invalid_action'},{status:400,headers});
    return NextResponse.json({data},{headers});
  }catch(e){const r=apiErrorResponse(e);r.headers.set('Cache-Control',headers['Cache-Control']);return r;}
}