import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { ApiError, apiErrorResponse } from '@/lib/http/errors';
import {
  buildH50BenchmarkReport,
  type H50HumanBenchmark,
  evaluateH50HumanBenchmark,
} from '@/lib/strategic/h50-platform';
import type { BenchmarkObservation } from '@/lib/strategic/benchmark-suite';

export async function POST(
  request: Request,
  context: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);

    if (
      !actor.permissions.includes('peopleanalytics.read') &&
      !actor.permissions.includes('platform.read')
    ) {
      throw new ApiError(
        403,
        'Analytics or platform access is required.',
        'forbidden',
      );
    }

    const body = (await request.json()) as {
      observations?: BenchmarkObservation[];
      humanBenchmark?: H50HumanBenchmark;
    };

    if (!Array.isArray(body.observations)) {
      throw new ApiError(
        400,
        'Benchmark observations are required.',
        'invalid_request',
      );
    }

    return NextResponse.json({
      data: {
        strategic: buildH50BenchmarkReport(body.observations),
        human: body.humanBenchmark
          ? evaluateH50HumanBenchmark(body.humanBenchmark)
          : null,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
