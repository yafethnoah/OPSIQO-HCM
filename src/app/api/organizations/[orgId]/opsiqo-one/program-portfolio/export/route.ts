import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { programPortfolioExport } from '@/lib/opsiqo-one/program-portfolio';
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){
  try{
    const{orgId}=await context.params,actor=await actorFromRequest(request,orgId),url=new URL(request.url),raw=url.searchParams.get('format')||'csv';
    if(raw!=='csv'&&raw!=='json')return NextResponse.json({message:'format must be csv or json',code:'invalid_format'},{status:400});
    const result=await programPortfolioExport(actor,raw);
    return new NextResponse(result.body,{status:200,headers:{'Content-Type':result.contentType,'Content-Disposition':`attachment; filename="${result.fileName}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
  }catch(e){return apiErrorResponse(e)}
}
