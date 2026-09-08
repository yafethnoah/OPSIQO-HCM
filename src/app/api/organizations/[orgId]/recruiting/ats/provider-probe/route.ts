import { NextResponse } from "next/server";
import { actorFromRequest, requirePermission } from "@/lib/auth/session";
import { apiErrorResponse } from "@/lib/http/errors";
import { probeRecruitingAiProvider } from "@/lib/recruiting/ats-provider";

export async function POST(
  request: Request,
  context: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, "recruiting.manage");
    return NextResponse.json({
      data: await probeRecruitingAiProvider(actor),
    });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
