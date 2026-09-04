import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { uploadAttendancePhoto } from '@/lib/time/frontline-service';
export async function POST(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'time.clock');return NextResponse.json({data:await uploadAttendancePhoto(actor,await request.formData())},{status:201});}catch(e){return apiErrorResponse(e);}}
