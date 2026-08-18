import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/http/errors';
import { platformAdministratorFromRequest } from '@/lib/platform/authorization';

export async function GET(request: Request) {
  try {
    const actor = await platformAdministratorFromRequest(request);
    return NextResponse.json({
      data: {
        allowed: true,
        uid: actor.uid,
        email: actor.email,
        source: actor.source,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
