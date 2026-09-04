import { NextResponse } from 'next/server';
import { actorFromRequest,requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { integrationDashboard } from '@/lib/integration/service';
import { runtimeDashboard } from '@/lib/integration/runtime-service';
import { buildIntegrationProductionUatEvidence } from '@/lib/integration/production-uat';
export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'integration.read');const[base,runtime]=await Promise.all([integrationDashboard(actor),runtimeDashboard(actor)]);return NextResponse.json({data:buildIntegrationProductionUatEvidence(base,runtime)})}catch(e){return apiErrorResponse(e)}}
