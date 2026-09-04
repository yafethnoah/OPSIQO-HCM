import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { applyOrganizationLaunchpad, organizationLaunchpadPreview } from '@/lib/opsiqo-one/organization-launchpad';
const NO_STORE='private, no-store, max-age=0';export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params,actor=await actorFromRequest(request,orgId);return NextResponse.json({data:await organizationLaunchpadPreview(actor)},{headers:{'Cache-Control':NO_STORE}})}catch(e){const r=apiErrorResponse(e);r.headers.set('Cache-Control',NO_STORE);return r}}
export async function POST(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params,actor=await actorFromRequest(request,orgId),body=await request.json();return NextResponse.json({data:body?.preview===true?await organizationLaunchpadPreview(actor,body.profile):await applyOrganizationLaunchpad(actor,body)},{headers:{'Cache-Control':NO_STORE}})}catch(e){const r=apiErrorResponse(e);r.headers.set('Cache-Control',NO_STORE);return r}}
