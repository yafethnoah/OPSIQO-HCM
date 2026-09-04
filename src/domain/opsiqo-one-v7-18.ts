export interface TranslationBacklogRow {
  file:string;
  totalCandidates:number;
  reviewedCandidates:number;
  remainingCandidates:number;
}
export interface TranslationReadinessDashboard {
  supportedLocales:string[];
  scannedFiles:number;
  cataloguedSurfaceCount:number;
  catalogEntries:number;
  reviewedSourceCandidates:number;
  remainingCandidates:number;
  totalSourceCandidates:number;
  topBacklog:TranslationBacklogRow[];
  generatedAt:string;
  boundary:string;
}
export interface ExecutionUatGate {
  id:string;
  title:string;
  status:'implementation_pass'|'browser_uat_required'|'prohibited';
  evidence:string;
}
export interface ExecutionUatDashboard {
  currentActionId:string;
  implementationGates:ExecutionUatGate[];
  browserGates:ExecutionUatGate[];
  expansionStatus:'hold';
  candidateActionIds:string[];
  generatedAt:string;
  boundary:string;
}
export type ProgramPortfolioExportFormat='csv'|'json';
