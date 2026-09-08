import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { attendanceActivity, exportAttendanceActivityCsv } from '@/lib/time/frontline-service';

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
    const format=String(url.searchParams.get('format')||'json').toLowerCase();
    const requested=Number(url.searchParams.get('limit')||(format==='csv'?10000:500));
    const limit=Number.isFinite(requested)
      ?Math.max(1,Math.min(Math.trunc(requested),format==='csv'?10000:1000))
      :(format==='csv'?10000:500);

    const input={
      from:url.searchParams.get('from')||undefined,
      to:url.searchParams.get('to')||undefined,
      timeZone:url.searchParams.get('timeZone')||undefined,
      limit,
    };

    if(format==='csv'){
      const result=await exportAttendanceActivityCsv(actor,input);
      return new Response(result.csv,{
        headers:{
          ...noStoreHeaders,
          'Content-Type':'text/csv; charset=utf-8',
          'Content-Disposition':`attachment; filename="opsiqo-attendance-${result.range.from}-${result.range.to}.csv"`,
          'X-OPSIQO-Row-Count':String(result.rowCount),
        },
      });
    }

    if(format!=='json'){
      return NextResponse.json(
        {error:{code:'invalid_attendance_activity_format',message:'Attendance activity format must be json or csv.'}},
        {status:400,headers:noStoreHeaders},
      );
    }

    return NextResponse.json(
      {data:await attendanceActivity(actor,input)},
      {headers:noStoreHeaders},
    );
  }catch(e){
    return apiErrorResponse(e);
  }
}
