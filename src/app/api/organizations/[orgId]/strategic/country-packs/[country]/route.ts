import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { saveStrategicCountryPack } from '@/lib/strategic/five-phase-service';

export const dynamic = 'force-dynamic';
const NO_STORE = 'private, no-store, max-age=0';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ orgId: string; country: string }> },
) {
  try {
    const { orgId, country } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    return NextResponse.json(
      { data: await saveStrategicCountryPack(actor, await request.json(), country) },
      { headers: { 'Cache-Control': NO_STORE } },
    );
  } catch (error) {
    const response = apiErrorResponse(error);
    response.headers.set('Cache-Control', NO_STORE);
    return response;
  }
}