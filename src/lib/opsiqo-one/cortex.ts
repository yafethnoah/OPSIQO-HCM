import type { ActorContext, Permission } from '@/domain/security';
import type { CortexAgentDefinition, OpsiQoActionLevel } from '@/domain/opsiqo-one';

const agents: CortexAgentDefinition[] = [
  { id:'recruitment', name:'Recruitment Agent', purpose:'Requisitions, job descriptions, candidate evidence and interview preparation.', capabilities:['Requisition preparation','Job-description intelligence','Candidate evidence summaries','Interview preparation'], requiredAnyPermissions:['recruiting.read','recruiting.manage','recruiting.manage.team'], maxActionLevel:'prepare', humanOversight:true },
  { id:'onboarding', name:'Onboarding Agent', purpose:'Coordinate approved-hire onboarding work across HR tasks and configured workflows.', capabilities:['Onboarding preparation','Task coordination','Policy acknowledgement routing','Training handoff'], requiredAnyPermissions:['onboarding.read','onboarding.manage','onboarding.manage.team'], maxActionLevel:'prepare', humanOversight:true },
  { id:'employee-services', name:'Employee Services Agent', purpose:'Guide employees through leave, policies, documents and HR services.', capabilities:['Self-service guidance','Leave routing','Policy answers','HR service routing'], requiredAnyPermissions:['self.read'], maxActionLevel:'prepare', humanOversight:true },
  { id:'hr-operations', name:'HR Operations Agent', purpose:'Prepare governed employee and organization administration.', capabilities:['Employee-record preparation','Position routing','Workflow administration','Data-quality follow-up'], requiredAnyPermissions:['people.manage','positions.manage','workflow.manage'], maxActionLevel:'prepare', humanOversight:true },
  { id:'compliance', name:'HR Compliance Agent', purpose:'Surface compliance gaps, expiring requirements and evidence-backed remediation work.', capabilities:['Compliance radar','Expiry detection','Evidence review','Remediation planning'], requiredAnyPermissions:['compliance.read','governance.read','regulatory.read'], maxActionLevel:'recommend', humanOversight:true },
  { id:'learning', name:'Learning Agent', purpose:'Analyze skills, learning assignments and certification evidence.', capabilities:['Skills Passport','Skill-gap analysis','Learning recommendations','Certification monitoring'], requiredAnyPermissions:['learning.read'], maxActionLevel:'recommend', humanOversight:true },
  { id:'talent-mobility', name:'Talent Mobility Agent', purpose:'Support Career GPS and internal mobility from transparent role-readiness evidence.', capabilities:['Career GPS','Internal Talent Marketplace','Target-role evidence gaps','Development routing'], requiredAnyPermissions:['career.read'], maxActionLevel:'recommend', humanOversight:true },
  { id:'performance', name:'Performance Agent', purpose:'Support goals, check-ins and evidence-backed review preparation without assigning ratings.', capabilities:['Goal review','Check-in preparation','Evidence summaries'], requiredAnyPermissions:['performance.read'], maxActionLevel:'recommend', humanOversight:true },
  { id:'compensation', name:'Compensation Agent', purpose:'Support governed compensation analysis and job architecture.', capabilities:['Range analysis','Job architecture','Pay-equity review support'], requiredAnyPermissions:['compensation.read'], maxActionLevel:'recommend', humanOversight:true },
  { id:'workforce-planning', name:'Workforce Planning Agent', purpose:'Model headcount, vacancies, capacity and approved workforce scenarios.', capabilities:['Scenario Lab','Digital twin foundation','Headcount scenarios','Capacity analysis','Vacancy impact'], requiredAnyPermissions:['workforce.read'], maxActionLevel:'recommend', humanOversight:true },
  { id:'grant-workforce', name:'Grant Workforce Agent', purpose:'Connect explicit project, grant/funding, position and workforce allocation evidence for nonprofit and project-funded planning.', capabilities:['Grant workforce intelligence','Program workforce chain','Program portfolio evidence','Project funding exposure','Budget/actual evidence review','Funding expiry review','Allocation evidence','Nonprofit workforce planning'], requiredAnyPermissions:['workforce.read'], maxActionLevel:'recommend', humanOversight:true },
  { id:'workforce-registry', name:'Unified Workforce Agent', purpose:'Explain the permission-scoped human and digital workforce registry without merging identities or authority.', capabilities:['Unified workforce registry','Worker-type visibility','Digital-agent visibility'], requiredAnyPermissions:['workforce.read'], maxActionLevel:'observe', humanOversight:true },
  { id:'knowledge', name:'Organizational Memory Agent', purpose:'Retrieve permission-safe organizational policy, knowledge and process evidence with explicit internal citations.', capabilities:['Organizational Memory','Internal citations','Policy and process retrieval'], requiredAnyPermissions:['policies.read','service.read','workflow.read'], maxActionLevel:'recommend', humanOversight:true },
  { id:'automation-architect', name:'Automation Architect Agent', purpose:'Prepare governed workflow and agent configurations without bypassing activation or approval controls.', capabilities:['Agent Builder','Automation Marketplace','Workflow design','Governed configuration'], requiredAnyPermissions:['workflow.manage','ai.manage'], maxActionLevel:'prepare', humanOversight:true },
  { id:'policy', name:'Policy Agent', purpose:'Interpret governed organizational policy evidence and support controlled drafting.', capabilities:['Policy interpretation','Policy Intelligence','Cross-reference review','Acknowledgement impact','Organizational Memory'], requiredAnyPermissions:['policies.read','compliance.read'], maxActionLevel:'prepare', humanOversight:true },
  { id:'case-management', name:'Case Management Agent', purpose:'Support governed employee-relations intake and case administration.', capabilities:['Case routing','Evidence checklist','SLA follow-up'], requiredAnyPermissions:['er.intake','er.read'], maxActionLevel:'prepare', humanOversight:true },
  { id:'data-quality', name:'Data Quality Agent', purpose:'Detect incomplete or inconsistent HR records without silently changing authoritative data.', capabilities:['Completeness checks','Duplicate review','Relationship consistency'], requiredAnyPermissions:['people.read.directory','commandcenter.read'], maxActionLevel:'recommend', humanOversight:true },
  { id:'analytics', name:'Analytics Agent', purpose:'Explain workforce metrics, anomalies and approved forecasts from governed evidence.', capabilities:['Natural-language analytics','AI value measurement','Metric explanation','Trend investigation'], requiredAnyPermissions:['peopleanalytics.read'], maxActionLevel:'recommend', humanOversight:true },
  { id:'executive-advisor', name:'Executive Advisor', purpose:'Connect workforce, risk and organizational evidence for strategic decision support.', capabilities:['Strategic workforce briefs','Cross-domain risk summaries','Scenario framing'], requiredAnyPermissions:['strategy.read','commandcenter.read'], maxActionLevel:'recommend', humanOversight:true },
];

const levelOrder: Record<OpsiQoActionLevel, number> = { observe:0, recommend:1, prepare:2, execute:3 };


export function allCortexAgents(): CortexAgentDefinition[] {
  return agents.map(agent=>({...agent,capabilities:[...agent.capabilities],requiredAnyPermissions:[...agent.requiredAnyPermissions]}));
}

export function visibleCortexAgents(actor: ActorContext): CortexAgentDefinition[] {
  return agents
    .filter(agent=>agent.requiredAnyPermissions.some(permission=>actor.permissions.includes(permission as Permission)))
    .map(agent=>({...agent, capabilities:[...agent.capabilities], requiredAnyPermissions:[...agent.requiredAnyPermissions]}));
}

export function clampActionLevel(requested: OpsiQoActionLevel, allowed: OpsiQoActionLevel): OpsiQoActionLevel {
  return levelOrder[requested] <= levelOrder[allowed] ? requested : allowed;
}

export const opsiqoActionSafetyModel = [
  { level:'observe' as const, meaning:'Read permission-scoped information and explain what is happening.', humanControl:'No write occurs.' },
  { level:'recommend' as const, meaning:'Suggest an evidence-backed next action.', humanControl:'Authorized user decides whether to act.' },
  { level:'prepare' as const, meaning:'Prepare a draft, plan, form or workflow handoff using known context.', humanControl:'User reviews and confirms before authoritative execution.' },
  { level:'execute' as const, meaning:'Execute only explicitly authorized low-risk administrative actions through existing domain services.', humanControl:'Permissions are re-checked; consequential employment decisions remain blocked.' },
];
