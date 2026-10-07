import { NextResponse } from 'next/server';
import { actorFromRequest, identityFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import {
  changePlatformTenantLifecycle,
  inspectPlatformTenantForDeletion,
  permanentlyDeletePlatformTenant,
} from '@/lib/platform/tenant-management';

export async function GET(request:Request,context:{params:Promise<{orgId:string}>}) {
  try {
    const {orgId}=await context.params;
    const [actor,identity]=await Promise.all([actorFromRequest(request),identityFromRequest(request)]);
    return NextResponse.json({data:await inspectPlatformTenantForDeletion(actor,identity,orgId)});
  } catch (error) { return apiErrorResponse(error); }
}

export async function PATCH(request:Request,context:{params:Promise<{orgId:string}>}) {
  try {
    const {orgId}=await context.params;
    const [actor,identity,body]=await Promise.all([actorFromRequest(request),identityFromRequest(request),request.json()]);
    return NextResponse.json({data:await changePlatformTenantLifecycle(actor,identity,orgId,body)});
  } catch (error) { return apiErrorResponse(error); }
}

export async function DELETE(request:Request,context:{params:Promise<{orgId:string}>}) {
  try {
    const {orgId}=await context.params;
    const [actor,identity,body]=await Promise.all([actorFromRequest(request),identityFromRequest(request),request.json()]);
    return NextResponse.json({data:await permanentlyDeletePlatformTenant(actor,identity,orgId,body)});
  } catch (error) { return apiErrorResponse(error); }
}
