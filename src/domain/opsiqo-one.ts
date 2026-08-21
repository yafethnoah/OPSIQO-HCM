import type { IntelligentFormPreview, NaturalAnalyticsAnswer, OpsiQoCortexPlan, OpsiQoExplainability } from './opsiqo-one-v7-11';
import type { SafeExecutionReceipt } from './opsiqo-one-v7-16';
export type OpsiQoActionLevel = 'observe' | 'recommend' | 'prepare' | 'execute';
export type OpsiQoWorkBucket = 'needs_me' | 'waiting' | 'ai_working' | 'completed';
export type OpsiQoCommandMode = 'navigate' | 'prepare' | 'execute' | 'ai' | 'blocked';

export interface CortexAgentDefinition {
  id: string;
  name: string;
  purpose: string;
  capabilities: string[];
  requiredAnyPermissions: string[];
  maxActionLevel: OpsiQoActionLevel;
  humanOversight: boolean;
}

export interface KnowledgeGraphNode {
  id: string;
  kind: 'worker' | 'position' | 'org_unit' | 'skill' | 'project' | 'funding_source' | 'policy' | 'knowledge_article' | 'workflow' | 'course' | 'learning_path' | 'compliance_requirement' | 'onboarding_task';
  label: string;
  status?: string;
}

export interface KnowledgeGraphEdge {
  id: string;
  kind: 'worker_position' | 'worker_manager' | 'position_org_unit' | 'position_skill' | 'project_funding' | 'worker_project' | 'worker_funding' | 'project_org_unit' | 'policy_org_unit' | 'requirement_policy' | 'requirement_org_unit' | 'course_skill' | 'learning_path_course' | 'learning_path_position' | 'learning_path_skill' | 'worker_course' | 'policy_workflow' | 'policy_onboarding_form' | 'policy_onboarding_training';
  from: string;
  to: string;
  label: string;
}

export interface KnowledgeGraphSnapshot {
  scope: 'self' | 'team' | 'organization';
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  counts: {
    workers: number;
    positions: number;
    orgUnits: number;
    skills: number;
    projects: number;
    fundingSources: number;
    policies: number;
    knowledgeArticles: number;
    workflows: number;
    courses: number;
    learningPaths: number;
    complianceRequirements: number;
    onboardingTasks: number;
    relationships: number;
  };
  truncated: boolean;
  generatedAt: string;
  privacyNote: string;
}

export interface OpsiQoWorkItem {
  id: string;
  bucket: OpsiQoWorkBucket;
  source: 'attention' | 'ai_action_plan';
  title: string;
  summary: string;
  href: string;
  priority: 'info' | 'medium' | 'high' | 'critical';
  dueAt?: string;
  status?: string;
}

export interface OpsiQoOneOverview {
  generatedAt: string;
  role: string;
  mode: 'employee' | 'manager';
  workerDisplayName?: string;
  myDay: OpsiQoWorkItem[];
  workQueue: OpsiQoWorkItem[];
  workCounts: Record<OpsiQoWorkBucket, number>;
  cortexAgents: CortexAgentDefinition[];
  knowledgeGraph: KnowledgeGraphSnapshot;
  safetyModel: Array<{
    level: OpsiQoActionLevel;
    meaning: string;
    humanControl: string;
  }>;
}

export interface OpsiQoCommandResult {
  command: string;
  mode: OpsiQoCommandMode;
  actionLevel: OpsiQoActionLevel;
  title: string;
  message: string;
  href?: string;
  permission?: string;
  requiresHumanDecision: boolean;
  risk: 'low' | 'administrative' | 'high_impact' | 'consequential';
  aiRun?: unknown;
  cortexPlan?: OpsiQoCortexPlan;
  explainability?: OpsiQoExplainability;
  intelligentForm?: IntelligentFormPreview;
  analytics?: NaturalAnalyticsAnswer;
  executionReceipt?: SafeExecutionReceipt;
}
