import type { ActorContext } from '@/domain/security';
import type { AiActionPlan, AiRun } from '@/domain/ai-intelligence';
import type { AiValueDashboard } from '@/domain/opsiqo-one-v7-12';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { effectiveAgentPolicies } from './agent-governance';

const now=()=>new Date().toISOString();
const SOURCE_LIMIT=500;
function avg(values:number[]):number|null{return values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):null}

export async function aiValueDashboard(actor:ActorContext,periodDays=30):Promise<AiValueDashboard>{
  if(!(actor.permissions.includes('ai.audit')||actor.permissions.includes('ai.manage')))throw new ApiError(403,'AI audit or management permission required.','forbidden');
  const days=Math.max(7,Math.min(365,Math.round(periodDays||30))),since=Date.now()-days*86400000,db=adminDb();
  const [runSnap,planSnap,policies]=await Promise.all([db.collection(`organizations/${actor.orgId}/aiRuns`).orderBy('createdAt','desc').limit(SOURCE_LIMIT).get(),db.collection(`organizations/${actor.orgId}/aiActionPlans`).orderBy('createdAt','desc').limit(SOURCE_LIMIT).get(),effectiveAgentPolicies(actor)]);
  const runs=runSnap.docs.map(d=>d.data() as AiRun).filter(r=>Date.parse(r.createdAt)>=since),plans=planSnap.docs.map(d=>d.data() as AiActionPlan).filter(p=>Date.parse(p.createdAt)>=since);
  const completed=runs.filter(r=>r.status==='completed'),approvedOrCompleted=plans.filter(p=>['approved','completed'].includes(p.status)).length;
  return{periodDays:days,metrics:{aiRuns:runs.length,completedRuns:completed.length,blockedRuns:runs.filter(r=>r.status==='blocked').length,failedRuns:runs.filter(r=>r.status==='failed').length,insufficientEvidenceRuns:runs.filter(r=>r.status==='insufficient_evidence').length,actionPlansCreated:plans.length,actionPlansApproved:plans.filter(p=>p.status==='approved').length,actionPlansCompleted:plans.filter(p=>p.status==='completed').length,actionPlansCancelled:plans.filter(p=>p.status==='cancelled').length,averageLatencyMs:avg(runs.map(r=>r.latencyMs).filter(Number.isFinite)),averageConfidencePct:avg(completed.map(r=>r.answer?.confidence).filter((v):v is number=>typeof v==='number')),averageEvidenceCompletenessPct:avg(completed.map(r=>r.answer?.evidenceCompleteness).filter((v):v is number=>typeof v==='number')),approvedOrCompletedPlanRatePct:plans.length?Math.round(approvedOrCompleted/plans.length*100):null,enabledAgents:policies.filter(p=>p.enabled).length,shadowModeAgents:policies.filter(p=>p.shadowMode&&p.enabled).length,executeCapAgents:policies.filter(p=>p.hardMaxActionLevel==='execute').length},estimatedSavings:{hours:null,amount:null,currency:null,status:'not_configured'},quality:{bounded:runSnap.size>=SOURCE_LIMIT||planSnap.size>=SOURCE_LIMIT,sourceRunLimit:SOURCE_LIMIT,sourcePlanLimit:SOURCE_LIMIT},generatedAt:now(),governanceNotice:'AI Value reports measured OPSIQO AI activity and governance outcomes only. Time or financial savings remain Not configured until the organization supplies a validated baseline methodology; OPSIQO does not fabricate ROI. Blocked and insufficient-evidence runs are retained as safety/value evidence rather than hidden.'};
}
