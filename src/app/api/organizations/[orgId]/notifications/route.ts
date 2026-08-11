import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { listNotifications } from '@/lib/notifications/service';
export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'notifications.read');const url=new URL(request.url);return NextResponse.json({data:await listNotifications(actor,Number(url.searchParams.get('limit')||50))});}catch(e){return apiErrorResponse(e);}}
