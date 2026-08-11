export type WorkforcePlanStatus='draft'|'active'|'approved'|'archived';
export type WorkforceScenarioType='baseline'|'growth'|'reduction'|'restructure'|'budget';
export type WorkforceScenarioStatus='draft'|'modelled'|'approved'|'archived';
export type WorkforceActionType='hire'|'remove_position'|'vacancy_fill'|'planned_exit'|'transfer_in'|'transfer_out'|'compensation_adjustment';

export interface WorkforcePlanningAssumptions {
  currency:string;
  annualInflationPct:number;
  employerOnCostPct:number;
  vacancyCostPct:number;
  defaultSalaryGrowthPct:number;
  note:string;
}

export interface WorkforcePlan {
  id:string;
  code:string;
  name:string;
  description?:string;
  planningStart:string;
  planningEnd:string;
  status:WorkforcePlanStatus;
  assumptions:WorkforcePlanningAssumptions;
  createdBy:string;
  createdAt:string;
  updatedAt:string;
  approvedBy?:string;
  approvedAt?:string;
}

export interface WorkforceBaselineSnapshot {
  id:string;
  planId?:string;
  snapshotDate:string;
  currency:string;
  headcount:number;
  activeFte:number;
  occupiedPositions:number;
  vacantPositions:number;
  openRequisitions:number;
  annualBasePay:number;
  estimatedEmployerCost:number;
  verifiedSkillGaps:number;
  criticalPositions:number;
  uncoveredCriticalPositions:number;
  activeSeparations:number;
  sourceCounts:Record<string,number>;
  generatedBy:string;
  generatedAt:string;
}

export interface WorkforceScenarioAction {
  id:string;
  type:WorkforceActionType;
  positionId?:string;
  orgUnitId?:string;
  headcountDelta:number;
  fteDelta:number;
  annualBasePayDelta:number;
  effectiveDate:string;
  rationale:string;
}

export interface WorkforceScenarioProjection {
  headcount:number;
  activeFte:number;
  occupiedPositions:number;
  vacantPositions:number;
  annualBasePay:number;
  estimatedEmployerCost:number;
  netHeadcountChange:number;
  netFteChange:number;
  netAnnualBasePayChange:number;
  netEmployerCostChange:number;
}

export interface WorkforceScenario {
  id:string;
  planId:string;
  name:string;
  type:WorkforceScenarioType;
  description?:string;
  status:WorkforceScenarioStatus;
  baselineSnapshotId:string;
  assumptions:WorkforcePlanningAssumptions;
  actions:WorkforceScenarioAction[];
  projection:WorkforceScenarioProjection;
  budgetLimit?:number;
  budgetVariance?:number;
  createdBy:string;
  createdAt:string;
  updatedAt:string;
  approvedBy?:string;
  approvedAt?:string;
}

export interface WorkforceDemandItem {
  id:string;
  planId:string;
  positionId?:string;
  orgUnitId?:string;
  title:string;
  targetHeadcount:number;
  targetFte:number;
  targetDate:string;
  priority:'low'|'normal'|'high'|'critical';
  status:'planned'|'approved'|'fulfilled'|'cancelled';
  rationale:string;
  requiredSkillIds:string[];
  createdBy:string;
  createdAt:string;
  updatedAt:string;
}

export interface WorkforcePlanningRisk {
  id:string;
  severity:'info'|'warning'|'high'|'critical';
  code:string;
  title:string;
  description:string;
  href:string;
  evidence:string[];
  recommendedAction:string;
}

export interface WorkforcePlanningDashboard {
  scope:'organization';
  baseline:WorkforceBaselineSnapshot;
  plans:WorkforcePlan[];
  scenarios:WorkforceScenario[];
  demand:WorkforceDemandItem[];
  risks:WorkforcePlanningRisk[];
  metrics:Array<{key:string;label:string;value:number;helper:string}>;
  generatedAt:string;
  methodologyNotice:string;
}
