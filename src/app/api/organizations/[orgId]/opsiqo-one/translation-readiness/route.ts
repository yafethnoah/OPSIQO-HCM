import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { translationReadinessDashboard } from '@/lib/opsiqo-one/translation-readiness';
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){
  try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);return NextResponse.json({data:translationReadinessDashboard(actor)},{headers:{'Cache-Control':'private, no-store'}})}catch(e){return apiErrorResponse(e)}
}
