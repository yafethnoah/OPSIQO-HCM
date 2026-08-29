import { NextResponse } from 'next/server';
import { actorFromRequest, identityFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { createTenantBySuperAdmin, listPlatformTenants } from '@/lib/platform/tenant-management';

export async function GET(request:Request) {
  try {
    const actor = await actorFromRequest(request);
    return NextResponse.json({data:await listPlatformTenants(actor)});
  } catch (error) { return apiErrorResponse(error); }
}

export async function POST(request:Request) {
  try {
    const [actor,identity,body] = await Promise.all([actorFromRequest(request),identityFromRequest(request),request.json()]);
    return NextResponse.json({data:await createTenantBySuperAdmin(actor,identity,body)},{status:201});
  } catch (error) { return apiErrorResponse(error); }
}
