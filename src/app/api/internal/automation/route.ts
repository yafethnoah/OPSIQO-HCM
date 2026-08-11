import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runPhase1Automation } from '@/lib/automation/service';
import { apiErrorResponse, ApiError } from '@/lib/http/errors';

const bodySchema = z.object({ orgId: z.string().min(1).max(180) });

function authorized(request: Request) {
  const expected = process.env.OPSIQO_JOB_SECRET;
  if (!expected) throw new ApiError(503, 'OPSIQO_JOB_SECRET is not configured.', 'job_secret_missing');
  const supplied = request.headers.get('x-opsiqo-job-secret') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  try {
    if (!authorized(request)) throw new ApiError(401, 'Invalid automation job secret.', 'invalid_job_secret');
    const { orgId } = bodySchema.parse(await request.json());
    return NextResponse.json({ data: await runPhase1Automation(orgId) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
