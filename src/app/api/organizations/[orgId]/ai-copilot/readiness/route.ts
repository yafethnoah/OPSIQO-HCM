import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import {
  getAiActivationReadiness,
  initializeGovernedAi,
} from '@/lib/ai-intelligence/activation';

const NO_STORE = 'private, no-store, max-age=0';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    return NextResponse.json(
      { data: await getAiActivationReadiness(actor) },
      { headers: { 'Cache-Control': NO_STORE } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    const body = await request.json().catch(() => ({}));
    if (body?.action !== 'initialize') {
      return NextResponse.json(
        { error: 'Unsupported AI readiness action.' },
        { status: 400, headers: { 'Cache-Control': NO_STORE } },
      );
    }
    return NextResponse.json(
      { data: await initializeGovernedAi(actor) },
      { headers: { 'Cache-Control': NO_STORE } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
