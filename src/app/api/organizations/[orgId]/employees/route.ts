import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { createEmployee, listEmployees } from '@/lib/hr/service';

export async function GET(request: Request, context: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'people.read.directory');
    const url = new URL(request.url);
    const result = await listEmployees(actor, { q: url.searchParams.get('q') || undefined, pageSize: Number(url.searchParams.get('pageSize') || 50), cursor: url.searchParams.get('cursor') || undefined });
    return NextResponse.json(result);
  } catch (error) { return apiErrorResponse(error); }
}

export async function POST(request: Request, context: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'people.manage');
    const created = await createEmployee(actor, await request.json());
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) { return apiErrorResponse(error); }
}
