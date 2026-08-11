import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { getNotificationSettings, updateNotificationSettings } from '@/lib/notifications/service';
export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'notifications.manage');return NextResponse.json({data:await getNotificationSettings(actor)});}catch(e){return apiErrorResponse(e);}}
export async function PUT(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'notifications.manage');return NextResponse.json({data:await updateNotificationSettings(actor,await request.json())});}catch(e){return apiErrorResponse(e);}}
