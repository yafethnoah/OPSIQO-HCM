import { NextResponse } from "next/server";
import { actorFromRequest, requirePermission } from "@/lib/auth/session";
import { apiErrorResponse } from "@/lib/http/errors";
import { analyzeJobDescription } from "@/lib/recruiting/ats-engine";
import { parseJobDescriptionIntake } from "@/lib/recruiting/ats-service";
export async function POST(
  request: Request,
  context: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, "recruiting.manage");
    if (
      (request.headers.get("content-type") || "")
        .toLowerCase()
        .includes("multipart/form-data")
    )
      return NextResponse.json({
        data: await parseJobDescriptionIntake(actor, await request.formData()),
      });
    const body = await request.json();
    const text = String(body?.text || "").trim();
    if (text.length < 80 || text.length > 120000)
      return NextResponse.json(
        {
          message: "Job description must be between 80 and 120,000 characters.",
        },
        { status: 400 },
      );
    return NextResponse.json({ data: analyzeJobDescription(text) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
