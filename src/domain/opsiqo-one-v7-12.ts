import type { OpsiQoActionLevel } from './opsiqo-one';

export type EvidenceBand = 'strong' | 'developing' | 'exploratory' | 'unavailable';

export interface SkillsPassportSkill {
  skillId: string;
  code: string;
  name: string;
  category?: string;
  level: number;
  levelLabel: string;
  verificationStatus: string;
  evidenceStatus: 'verified' | 'self_reported' | 'expired';
  assessedAt: string;
  expiresAt?: string;
}

export interface SkillsPassportDashboard {
  worker: { id:string; displayName:string; employeeNumber:string; status:string };
  verifiedSkills: SkillsPassportSkill[];
  selfReportedSkills: SkillsPassportSkill[];
  expiredSkills: SkillsPassportSkill[];
  currentRoleGaps: Array<{ skillId:string; skillName:string; requiredLevel:number; verifiedLevel:number; gap:number; criticality:string; recommendedCourseIds:string[] }>;
  activeLearning: Array<{ id:string; courseId:string; courseTitle:string; status:string; progressPct:number; dueAt?:string }>;
  certificates: Array<{ id:string; courseTitle:string; certificateNumber:string; status:string; issuedAt:string; expiresAt?:string }>;
  evidenceCoveragePct: number | null;
  generatedAt: string;
  governanceNotice: string;
}

export interface CareerGpsRoadmapStep {
  id: string;
  category: 'evidence' | 'skill' | 'learning' | 'experience' | 'review';
  title: string;
  rationale: string;
  href: string;
  priority: 'high' | 'medium' | 'low';
}

export interface CareerGpsDashboard {
  worker: { id:string; displayName:string; currentPositionId?:string; currentPositionTitle?:string };
  profileConfigured: boolean;
  targetPosition?: { id:string; title:string; positionCode:string; location?:string };
  availableTargets: Array<{ id:string; title:string; positionCode:string; location?:string; source:'profile'|'opportunity' }>;
  readiness: { available:boolean; overallScore?:number; evidenceBand:EvidenceBand; verifiedSkillCoveragePct?:number; evidenceCompletenessPct?:number; performanceEvidenceAvailable:boolean; relevantLearningCompleted:number; relevantLearningTotal:number };
  missingSkills: Array<{ skillId:string; skillName:string; requiredLevel:number; verifiedLevel:number; criticality:string }>;
  recommendedCourses: Array<{ id:string; code:string; title:string; skillIds:string[]; durationMinutes:number }>;
  developmentPriorities: string[];
  roadmap: CareerGpsRoadmapStep[];
  generatedAt: string;
  governanceNotice: string;
}

export interface TalentMarketplaceOpportunity {
  positionId: string;
  positionTitle: string;
  positionCode: string;
  location?: string;
  requisitionId?: string;
  requisitionNumber?: string;
  evidenceBand: EvidenceBand;
  readinessScore?: number;
  verifiedSkillCoveragePct?: number;
  evidenceCompletenessPct?: number;
  matchedSkillCount?: number;
  requiredSkillCount?: number;
  missingSkills: string[];
  interestStatus?: string;
  actionHref: string;
}

export interface TalentMarketplaceDashboard {
  workerLinked: boolean;
  worker?: { id:string; displayName:string; employeeNumber:string };
  opportunities: TalentMarketplaceOpportunity[];
  metrics: { openOpportunities:number; strongMatches:number; developingMatches:number; expressedInterests:number };
  generatedAt: string;
  governanceNotice: string;
}

export interface ScenarioLabScenario {
  id: string;
  name: string;
  type: string;
  status: string;
  currency: string;
  headcount: number;
  activeFte: number;
  vacantPositions: number;
  annualBasePay: number;
  estimatedEmployerCost: number;
  headcountDelta: number;
  fteDelta: number;
  annualBasePayDelta: number;
  employerCostDelta: number;
  budgetLimit?: number;
  budgetVariance?: number;
  evidenceStatus: 'modelled' | 'approved' | 'draft' | 'archived';
}

export interface ScenarioLabDashboard {
  baseline: { headcount:number; activeFte:number; occupiedPositions:number; vacantPositions:number; annualBasePay:number; estimatedEmployerCost:number; currency:string; openRequisitions:number; verifiedSkillGaps:number };
  digitalTwin: { people:number; positions:number; orgUnits:number; skills:number; projects:number; fundingSources:number; policies:number; knowledgeArticles:number; workflows:number; courses:number; learningPaths:number; complianceRequirements:number; onboardingTasks:number; relationships:number; truncated:boolean };
  scenarios: ScenarioLabScenario[];
  risks: Array<{ id:string; severity:string; title:string; description:string; recommendedAction:string }>;
  recommendedQuestions: string[];
  generatedAt: string;
  governanceNotice: string;
}

export interface AiValueDashboard {
  periodDays: number;
  metrics: {
    aiRuns: number;
    completedRuns: number;
    blockedRuns: number;
    failedRuns: number;
    insufficientEvidenceRuns: number;
    actionPlansCreated: number;
    actionPlansApproved: number;
    actionPlansCompleted: number;
    actionPlansCancelled: number;
    averageLatencyMs: number | null;
    averageConfidencePct: number | null;
    averageEvidenceCompletenessPct: number | null;
    approvedOrCompletedPlanRatePct: number | null;
    enabledAgents: number;
    shadowModeAgents: number;
    executeCapAgents: number;
  };
  estimatedSavings: { hours:number|null; amount:number|null; currency:string|null; status:'not_configured'|'configured' };
  quality: { bounded:boolean; sourceRunLimit:number; sourcePlanLimit:number };
  generatedAt: string;
  governanceNotice: string;
}

export interface OpsiQoAdvancedCapability {
  id: 'skills_passport' | 'career_gps' | 'talent_marketplace' | 'scenario_lab' | 'ai_value';
  title: string;
  href: string;
  permission: string;
  actionLevel: OpsiQoActionLevel;
  description: string;
}
