import { NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest,requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { askCopilot } from '@/lib/ai-intelligence/service';
import { routeOpsiQoCommand } from '@/lib/opsiqo-one/command-router';
import { buildCortexPlan,explainCommand } from '@/lib/opsiqo-one/orchestration';
import { intelligentFormPreview } from '@/lib/opsiqo-one/smart-forms';
import { answerNaturalAnalytics } from '@/lib/opsiqo-one/natural-analytics';
import { getSuperAppPreference } from '@/lib/superapp/service';
import type { IntelligentFormPreview } from '@/domain/opsiqo-one-v7-11';
import { executeSafeOpsiQoAction } from '@/lib/opsiqo-one/safe-execution';
const schema=z.object({command:z.string().trim().min(3).max(4000)});const NO_STORE='private, no-store, max-age=0';export const dynamic='force-dynamic';
function formKind(title:string):IntelligentFormPreview['kind']|null{if(title==='Prepare leave request')return'leave_request';if(title==='Prepare onboarding')return'onboarding';if(title==='Prepare position')return'position';if(title==='Prepare workflow')return'workflow';return null}
export async function POST(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'self.read');const{command}=schema.parse(await request.json());const routed=routeOpsiQoCommand(actor,command);const cortexPlan=await buildCortexPlan(actor,command,routed),explainability=explainCommand(routed,cortexPlan),kind=formKind(routed.title),intelligentForm=kind?await intelligentFormPreview(actor,kind):undefined;
 if(routed.mode==='execute'){const executionReceipt=await executeSafeOpsiQoAction(actor,routed);return NextResponse.json({data:{...routed,cortexPlan,explainability,intelligentForm,executionReceipt}},{headers:{'Cache-Control':NO_STORE}})}
 if(routed.mode!=='ai')return NextResponse.json({data:{...routed,cortexPlan,explainability,intelligentForm}},{headers:{'Cache-Control':NO_STORE}});
 if(routed.title==='Analyze workforce evidence'){const analytics=await answerNaturalAnalytics(actor,command);return NextResponse.json({data:{...routed,cortexPlan,explainability,analytics}},{headers:{'Cache-Control':NO_STORE}})}
 const preference=await getSuperAppPreference(actor);const aiRun=await askCopilot(actor,{question:command,responseLocale:preference.locale});return NextResponse.json({data:{...routed,cortexPlan,explainability,aiRun}},{headers:{'Cache-Control':NO_STORE}})}catch(e){const r=apiErrorResponse(e);r.headers.set('Cache-Control',NO_STORE);return r}}
