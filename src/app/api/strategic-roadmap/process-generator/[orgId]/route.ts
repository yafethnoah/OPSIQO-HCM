import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { ApiError, apiErrorResponse } from '@/lib/http/errors';
import { generateHrProcessDraft } from '@/lib/strategic/hr-process-generator';

export async function POST(
  request: Request,
  context: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);

    if (
      !actor.permissions.includes('workflow.manage') &&
      !actor.permissions.includes('ai.use')
    ) {
      throw new ApiError(
        403,
        'Workflow management or AI use permission is required.',
        'forbidden',
      );
    }

    const body = (await request.json()) as { prompt?: unknown };

    if (typeof body.prompt !== 'string') {
      throw new ApiError(400, 'A process prompt is required.', 'invalid_request');
    }

    return NextResponse.json({
      data: generateHrProcessDraft(body.prompt),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
