import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/http/errors';
import { platformAdministratorFromRequest } from '@/lib/platform/authorization';
import { listPlatformOrganizations, provisionOrganization } from '@/lib/platform/organization-provisioning';

export async function GET(request: Request) {
  try {
    await platformAdministratorFromRequest(request);
    return NextResponse.json({ data: await listPlatformOrganizations() });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await platformAdministratorFromRequest(request);
    const body = await request.json();
    return NextResponse.json({ data: await provisionOrganization(actor, body) }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
