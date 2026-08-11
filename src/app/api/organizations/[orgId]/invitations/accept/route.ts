import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/http/errors';
import { acceptInvitation } from '@/lib/membership/service';

export async function POST(request: Request, context: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await context.params;
    return NextResponse.json({ data: await acceptInvitation(request, orgId, await request.json()) });
  } catch (error) { return apiErrorResponse(error); }
}
