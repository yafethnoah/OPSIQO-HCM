import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import {
  getOntarioAssurance,
  reviewOntarioEvidence,
  submitOntarioEvidence,
  syncOntarioRemediationTasks,
  updateOntarioRemediationTask,
} from '@/lib/country-compliance/ontario-assurance-service';

export const dynamic = 'force-dynamic';
const NO_STORE = 'private, no-store, max-age=0';

export async function GET(request: Request, context: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    return NextResponse.json(
      { data: await getOntarioAssurance(actor) },
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

    let data;
    switch (body.action) {
      case 'submit_evidence':
        data = await submitOntarioEvidence(actor, body.input);
        break;
      case 'review_evidence':
        data = await reviewOntarioEvidence(actor, body.input);
        break;
      case 'sync_tasks':
        data = await syncOntarioRemediationTasks(actor);
        break;
      case 'update_task':
        data = await updateOntarioRemediationTask(actor, body.input);
        break;
      default:
        return NextResponse.json(
          { error: 'Unsupported Ontario assurance action.', code: 'invalid_action' },
          { status: 400, headers: { 'Cache-Control': NO_STORE } },
        );
    }

    return NextResponse.json({ data }, { headers: { 'Cache-Control': NO_STORE } });
  } catch (error) {
    const response = apiErrorResponse(error);
    response.headers.set('Cache-Control', NO_STORE);
    return response;
  }
}