import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { liveAttendance } from '@/lib/time/frontline-service';

const noStoreHeaders={'Cache-Control':'no-store, max-age=0','CDN-Cache-Control':'no-store'};
export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'time.read');return NextResponse.json({data:await liveAttendance(actor)},{headers:noStoreHeaders});}catch(e){return apiErrorResponse(e);}}
