import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { markNotificationRead } from '@/lib/notifications/service';
export async function POST(request:Request,context:{params:Promise<{orgId:string;notificationId:string}>}){try{const{orgId,notificationId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'notifications.read');return NextResponse.json({data:await markNotificationRead(actor,notificationId)});}catch(e){return apiErrorResponse(e);}}
