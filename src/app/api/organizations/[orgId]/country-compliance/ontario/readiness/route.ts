import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import {
  getOntarioComplianceReadiness,
  saveOntarioComplianceProfile,
} from '@/lib/country-compliance/ontario-readiness-service';

export const dynamic = 'force-dynamic';
const NO_STORE = 'private, no-store, max-age=0';

export async function GET(request: Request, context: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    return NextResponse.json(
      { data: await getOntarioComplianceReadiness(actor) },
      { headers: { 'Cache-Control': NO_STORE } },
    );
  } catch (error) {
    const response = apiErrorResponse(error);
    response.headers.set('Cache-Control', NO_STORE);
    return response;
  }
}

export async function POST(request: Request, context: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    const body = await request.json() as { action?: string; input?: unknown };

    if (body.action !== 'save_profile') {
      return NextResponse.json(
        { error: 'Unsupported Ontario readiness action.', code: 'invalid_action' },
        { status: 400, headers: { 'Cache-Control': NO_STORE } },
      );
    }

    return NextResponse.json(
      { data: await saveOntarioComplianceProfile(actor, body.input) },
      { headers: { 'Cache-Control': NO_STORE } },
    );
  } catch (error) {
    const response = apiErrorResponse(error);
    response.headers.set('Cache-Control', NO_STORE);
    return response;
  }
}