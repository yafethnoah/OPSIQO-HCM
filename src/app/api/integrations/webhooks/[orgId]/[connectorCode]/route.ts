import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/http/errors';
import { ingestSignedWebhook } from '@/lib/integration/runtime-service';
export async function POST(request:Request,context:{params:Promise<{orgId:string;connectorCode:string}>}){
  try{
    const{orgId,connectorCode}=await context.params;
    const timestamp=String(request.headers.get('x-opsiqo-timestamp')||'');
    const signature=String(request.headers.get('x-opsiqo-signature')||'');
    const correlationId=request.headers.get('x-correlation-id')||undefined;
    const body=await request.text();
    return NextResponse.json({data:await ingestSignedWebhook({orgId,connectorCode,timestamp,signature,body,correlationId})},{status:202});
  }catch(e){return apiErrorResponse(e)}
}
