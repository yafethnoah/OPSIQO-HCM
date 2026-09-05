import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { attendanceActivity } from '@/lib/time/frontline-service';

const noStoreHeaders={
  'Cache-Control':'no-store, max-age=0',
  'CDN-Cache-Control':'no-store',
};

export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){
  try{
    const{orgId}=await context.params;
    const actor=await actorFromRequest(request,orgId);
    requirePermission(actor,'time.read');

    const url=new URL(request.url);
    const requested=Number(url.searchParams.get('limit')||100);
    const limit=Number.isFinite(requested)
      ?Math.max(1,Math.min(Math.trunc(requested),200))
      :100;

    return NextResponse.json(
      {data:await attendanceActivity(actor,limit)},
      {headers:noStoreHeaders},
    );
  }catch(e){
    return apiErrorResponse(e);
  }
}
