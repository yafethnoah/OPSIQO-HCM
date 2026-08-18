import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/http/errors';
import { platformAdministratorFromRequest } from '@/lib/platform/authorization';
import { actOnPlatformOrganization } from '@/lib/platform/organization-provisioning';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ orgId: string }> },
) {
  try {
    const actor = await platformAdministratorFromRequest(request);
    const { orgId } = await context.params;
    const body = await request.json();
    return NextResponse.json({ data: await actOnPlatformOrganization(actor, orgId, body) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
