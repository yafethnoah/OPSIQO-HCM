import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { markPaycheckPaid } from '@/lib/payroll/paycheck-ledger';

export async function POST(
  request: Request,
  context: { params: Promise<{ orgId: string; paycheckId: string }> },
) {
  try {
    const { orgId, paycheckId } = await context.params;
    const actor = await actorFromRequest(request, orgId);

    return NextResponse.json({
      data: await markPaycheckPaid(actor, paycheckId, await request.json()),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
