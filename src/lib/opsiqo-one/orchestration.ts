import { createHash } from 'crypto';
import type { ActorContext } from '@/domain/security';
import type { OpsiQoActionLevel, OpsiQoCommandResult } from '@/domain/opsiqo-one';
import type { OpsiQoCortexPlan, OpsiQoExplainability } from '@/domain/opsiqo-one-v7-11';
import { visibleCortexAgents } from './cortex';
import { effectiveAgentPolicies } from './agent-governance';
import { activeCustomAgentDefinitions } from './agent-builder';

const rank:Record<OpsiQoActionLevel,number>={observe:0,recommend:1,prepare:2,execute:3};
const now=()=>new Date().toISOString();
const keywords:Record<string,RegExp>={
  recruitment:/\b(recruit|candidate|applicant|job description|interview|requisition|hire)\b/i,
  onboarding:/\b(onboard|onboarding|new hire)\b/i,
  'employee-services':/\b(leave|vacation|pto|policy|letter|employee service|hr help|time off)\b/i,
  'hr-operations':/\b(employee record|position|organization|org unit|workflow|data quality)\b/i,
  compliance:/\b(compliance|certificate|certification|expiry|expired|policy|requirement)\b/i,
  learning:/\b(learning|training|skill|skills passport|course|certificate|certification)\b/i,
  'talent-mobility':/\b(career|career gps|internal opportunity|talent marketplace|internal mobility|target role)\b/i,
  performance:/\b(performance|goal|review|one-on-one|check-in)\b/i,
  compensation:/\b(compensation|salary|pay|wage|range|equity)\b/i,
  'workforce-planning':/\b(headcount|workforce|capacity|vacancy|scenario|scenario lab|digital twin|what if|simulation)\b/i,
  'grant-workforce':/\b(grant|funding|funded workforce|program workforce|project workforce|project cost|program cost)\b/i,
  knowledge:/\b(organizational memory|company memory|internal knowledge|handbook|procedure|sop|what does our policy)\b/i,
  'automation-architect':/\b(agent builder|automation marketplace|workflow pack|build agent|custom agent)\b/i,
  policy:/\b(policy|handbook|procedure|sop|policy intelligence)\b/i,
  'case-management':/\b(case|employee relations|complaint|grievance|investigation)\b/i,
  'data-quality':/\b(duplicate|missing data|data quality|incomplete|inconsistent)\b/i,
  analytics:/\b(analytics|turnover|trend|compare|forecast|metric|why)\b/i,
  'executive-advisor':/\b(strategy|executive|board|risk|scenario|impact)\b/i,
};

export async function buildCortexPlan(actor:ActorContext,command:string,routed:OpsiQoCommandResult):Promise<OpsiQoCortexPlan>{
  if(routed.mode==='execute'&&routed.risk==='low'){return{id:createHash('sha256').update(`${actor.orgId}:${actor.uid}:${command}:safe-execute`).digest('hex').slice(0,16),command,agents:['safe-self-service'],steps:[{id:'step-1',agentId:'safe-self-service',agentName:'Safe Self-Service Executor',actionLevel:'execute',title:routed.title,description:'Hard-coded allowlisted self-service execution. The authoritative domain service re-checks actor permission and record visibility before changing state.',status:'planned'}],effectiveMaxActionLevel:'execute',shadowMode:false,requiresHumanCheckpoint:false,executionBoundary:'Execute is available only to hard-coded low-risk self-service actions. This path cannot run employment, compensation, approval, personnel, workflow activation, security or tenant-administration decisions.',createdAt:now()};}
  const custom=await activeCustomAgentDefinitions(actor);
  const customAgents=custom.map(x=>({id:x.id,name:x.name,purpose:x.purpose,capabilities:[...x.capabilities],requiredAnyPermissions:[...x.requiredAnyPermissions],maxActionLevel:x.maxActionLevel,humanOversight:true}));
  const visible=[...visibleCortexAgents(actor),...customAgents],policies=await effectiveAgentPolicies(actor),policyMap=new Map(policies.map(p=>[p.agentId,p]));
  const commandLower=command.toLowerCase();
  let selected=visible.filter(agent=>keywords[agent.id]?.test(command)||custom.find(x=>x.id===agent.id)?.keywords.some(k=>commandLower.includes(k.toLowerCase())));
  if(!selected.length&&visible.length)selected=[visible.find(a=>a.id==='employee-services')||visible[0]!];
  selected=selected.filter(agent=>policyMap.get(agent.id)?.enabled!==false).slice(0,4);
  const steps=selected.map((agent,index)=>{
    const policy=policyMap.get(agent.id),allowed=policy?.maxActionLevel||agent.maxActionLevel;
    const requested=routed.actionLevel;
    const effective=rank[requested]<=rank[allowed]?requested:allowed;
    const blocked=policy?.enabled===false;
    return{id:`step-${index+1}`,agentId:agent.id,agentName:agent.name,actionLevel:effective,title:`${agent.name}: ${routed.title}`,description:agent.purpose,status:blocked?'blocked' as const:'planned' as const,reason:blocked?'Agent disabled by organization AI governance.':undefined};
  });
  const max=steps.reduce<OpsiQoActionLevel>((value,step)=>rank[step.actionLevel]>rank[value]?step.actionLevel:value,'observe');
  return{id:createHash('sha256').update(`${actor.orgId}:${actor.uid}:${command}`).digest('hex').slice(0,16),command,agents:steps.map(x=>x.agentId),steps,effectiveMaxActionLevel:max,shadowMode:steps.some(step=>policyMap.get(step.agentId)?.shadowMode===true),requiresHumanCheckpoint:routed.requiresHumanDecision||routed.risk==='consequential'||rank[max]>=rank.prepare,executionBoundary:'Cortex may coordinate evidence and preparation, but authoritative writes remain inside existing OPSIQO domain services after permission re-checks and required human checkpoints.',createdAt:now()};
}

export function explainCommand(routed:OpsiQoCommandResult,plan:OpsiQoCortexPlan):OpsiQoExplainability{
  const missing:string[]=[];
  if(routed.mode==='prepare')missing.push('Transaction-specific required fields must be completed in the governed workflow.');
  if(routed.risk==='high_impact'||routed.risk==='consequential')missing.push('Authorized human decision/approval is required.');
  return{evidence:['Authenticated organization membership','Current role permissions',...plan.agents.map(x=>`Cortex agent policy: ${x}`)],policy:['OPSIQO AI Action Safety Model','Existing domain-service validation','Human oversight for consequential employment decisions'],reasoningSummary:`OPSIQO classified this request as ${routed.actionLevel} / ${routed.risk} and selected ${plan.steps.length} permission-available Cortex agent(s).`,missingInformation:missing,confidence:plan.steps.length?95:70,humanDecisionRequired:plan.requiresHumanCheckpoint,limitations:['Cortex does not infer protected traits.','This explanation is operational decision support, not a legal compliance conclusion.','No direct Firestore write is performed by the command layer.']};
}
