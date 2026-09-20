import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { listPaycheckLedger } from '@/lib/payroll/paycheck-ledger';

export async function GET(
  request: Request,
  context: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    const url = new URL(request.url);

    const data = await listPaycheckLedger(actor, {
      status: url.searchParams.get('status') || 'all',
      from: url.searchParams.get('from') || undefined,
      to: url.searchParams.get('to') || undefined,
      runId: url.searchParams.get('runId') || undefined,
      workerId: url.searchParams.get('workerId') || undefined,
      asOf: url.searchParams.get('asOf') || undefined,
    });

    return NextResponse.json(
      { data },
      {
        headers: {
          'cache-control': 'no-store, max-age=0',
          'cdn-cache-control': 'no-store',
        },
      },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
