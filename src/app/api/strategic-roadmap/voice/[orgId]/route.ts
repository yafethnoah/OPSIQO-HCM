import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { ApiError, apiErrorResponse } from '@/lib/http/errors';
import { handleVoiceHrTranscript } from '@/lib/strategic/voice-hr';

export async function POST(
  request: Request,
  context: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    const body = (await request.json()) as {
      transcript?: unknown;
      locale?: unknown;
    };

    if (typeof body.transcript !== 'string') {
      throw new ApiError(400, 'A voice transcript is required.', 'invalid_request');
    }

    if (
      body.locale !== undefined &&
      typeof body.locale !== 'string'
    ) {
      throw new ApiError(400, 'Voice locale must be a string.', 'invalid_request');
    }

    return NextResponse.json({
      data: handleVoiceHrTranscript(actor, {
        transcript: body.transcript,
        locale: body.locale,
      }),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
