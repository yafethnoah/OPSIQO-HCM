import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { registerMobileDevice, revokeMobileDevice } from '@/lib/mobile/service';
import { mobileDeviceRevokeSchema } from '@/lib/mobile/schemas';

export async function POST(request:Request, context:{params:Promise<{orgId:string}>}) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    return NextResponse.json({ data: await registerMobileDevice(actor, await request.json()) }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request:Request, context:{params:Promise<{orgId:string}>}) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    const input = mobileDeviceRevokeSchema.parse(await request.json());
    return NextResponse.json({ data: await revokeMobileDevice(actor, input.installationId) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
