import { NextResponse } from "next/server";
import { actorFromRequest, requirePermission } from "@/lib/auth/session";
import { apiErrorResponse } from "@/lib/http/errors";
import {
  parseJobDescriptionIntake,
  parseJobDescriptionTextIntake,
} from "@/lib/recruiting/ats-service";

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
    return NextResponse.json({
      data: await parseJobDescriptionTextIntake(actor, text),
    });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
