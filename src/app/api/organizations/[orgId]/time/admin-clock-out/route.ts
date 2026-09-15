import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { adminClockOut } from '@/lib/time/attendance-integrity';
import { getTimecard } from '@/lib/time/service';

export async function POST(
  req: Request,
  ctx: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await ctx.params;
    const actor = await actorFromRequest(req, orgId);
    requirePermission(actor, 'time.manage');
    const result = await adminClockOut(actor, await req.json());
    const timecard = await getTimecard(
      actor,
      result.workerId,
      result.workDate,
    );
    return NextResponse.json({ data: { ...result, timecard } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}