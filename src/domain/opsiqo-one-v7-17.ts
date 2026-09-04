export type ProgramFinancialEvidenceKind='approved_budget'|'actual'|'commitment'|'forecast';
export type ProgramFinancialEvidenceSource='finance_export'|'ledger_extract'|'approved_budget'|'invoice_batch'|'manual_verified';
export interface ProgramFinancialEvidence {
  id:string;
  projectId:string;
  fundingSourceId:string;
  kind:ProgramFinancialEvidenceKind;
  amount:number;
  currency:string;
  evidenceDate:string;
  sourceType:ProgramFinancialEvidenceSource;
  sourceReference:string;
  note?:string;
  createdBy:string;
  createdAt:string;
}
export interface ProgramPortfolioRow {
  projectId:string;
  projectCode:string;
  projectName:string;
  fundingSourceId:string;
  fundingCode:string;
  fundingName:string;
  currency:string;
  workerCount:number;
  allocationCount:number;
  plannedWorkforceAmount:number|null;
  approvedBudget:number|null;
  actual:number|null;
  commitment:number|null;
  forecast:number|null;
  budgetVariance:number|null;
  budgetUtilizationPct:number|null;
  evidenceCount:number;
  evidenceFreshThrough?:string;
  evidenceState:'complete'|'partial'|'not_configured';
}
export interface ProgramPortfolioDashboard {
  rows:ProgramPortfolioRow[];
  currencySummaries:Array<{currency:string;approvedBudget:number|null;actual:number|null;commitment:number|null;forecast:number|null;plannedWorkforceAmount:number|null;projectCount:number}>;
  evidence:ProgramFinancialEvidence[];
  metrics:{projects:number;projectsWithBudgetEvidence:number;projectsWithActualEvidence:number;projectsWithCompleteEvidence:number;projectsMissingFinancialEvidence:number};
  signals:Array<{id:string;severity:'high'|'medium'|'info';title:string;summary:string;href:string}>;
  generatedAt:string;
  methodologyNotice:string;
}
export type MeetingWorkflowTemplateId='action_register'|'sequenced_follow_up'|'review_gate';
export interface MeetingWorkflowTemplate {
  id:MeetingWorkflowTemplateId;
  name:string;
  description:string;
  behavior:string;
  requiresSeparateActivation:true;
  createsDisabledWorkflow:true;
}
export interface BrowserAccessibilityEvidence {
  route:string;
  viewport:string;
  checks:Array<{id:string;status:'pass'|'fail'|'manual';detail:string}>;
  generatedAt:string;
}
export interface TranslationInventorySummary {
  supportedLocales:Array<'en'|'fr'|'es'|'ar'>;
  scannedFiles:number;
  cataloguedSurfaceCount:number;
  legacyCandidateCount:number;
  candidateExamples:Array<{file:string;sample:string}>;
  generatedAt:string;
  boundary:string;
}
export interface ExecutionReadinessItem {
  id:string;
  title:string;
  status:'enabled'|'hold_for_uat'|'prohibited';
  reason:string;
}
export interface ExecutionReadinessDashboard {
  enabledActions:ExecutionReadinessItem[];
  candidates:ExecutionReadinessItem[];
  prohibited:ExecutionReadinessItem[];
  generatedAt:string;
  boundary:string;
}
