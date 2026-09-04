import type { ActorContext } from '@/domain/security';
import type { AiActionPlan } from '@/domain/ai-intelligence';
import type { OpsiQoOneOverview, OpsiQoWorkBucket, OpsiQoWorkItem } from '@/domain/opsiqo-one';
import { aiDashboard } from '@/lib/ai-intelligence/service';
import { superAppDashboard } from '@/lib/superapp/service';
import { visibleCortexAgents, opsiqoActionSafetyModel } from './cortex';
import { buildKnowledgeGraphSnapshot } from './knowledge-graph';

function planBucket(plan:AiActionPlan):OpsiQoWorkBucket{if(plan.status==='completed'||plan.status==='cancelled')return'completed';if(plan.status==='draft')return'ai_working';return'waiting'}
function planPriority(plan:AiActionPlan):OpsiQoWorkItem['priority']{return plan.status==='approved'?'medium':'info'}

export async function opsiqoOneOverview(actor:ActorContext):Promise<OpsiQoOneOverview>{
  const [home,knowledgeGraph,ai]=await Promise.all([
    superAppDashboard(actor),
    buildKnowledgeGraphSnapshot(actor),
    actor.permissions.includes('ai.use')?aiDashboard(actor).catch(()=>null):Promise.resolve(null),
  ]);
  const attention:OpsiQoWorkItem[]=home.attention.map(item=>({id:`attention:${item.id}`,bucket:'needs_me',source:'attention',title:item.title,summary:item.summary,href:item.href,priority:item.severity,dueAt:item.dueAt,status:item.type}));
  const plans:OpsiQoWorkItem[]=(ai?.actionPlans||[]).map(plan=>({id:`ai:${plan.id}`,bucket:planBucket(plan),source:'ai_action_plan',title:plan.title,summary:`${plan.tasks.filter(task=>task.status==='completed').length}/${plan.tasks.length} task(s) completed · ${plan.status}`,href:'/ai-copilot',priority:planPriority(plan),status:plan.status}));
  const workQueue=[...attention,...plans];
  const workCounts:Record<OpsiQoWorkBucket,number>={needs_me:0,waiting:0,ai_working:0,completed:0};for(const item of workQueue)workCounts[item.bucket]+=1;
  return{generatedAt:new Date().toISOString(),role:actor.role,mode:home.mode,workerDisplayName:home.employee.worker?.displayName,myDay:attention.slice(0,5),workQueue,workCounts,cortexAgents:visibleCortexAgents(actor),knowledgeGraph,safetyModel:opsiqoActionSafetyModel};
}
