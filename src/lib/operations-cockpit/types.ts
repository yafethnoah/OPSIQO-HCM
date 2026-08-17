export type CockpitTruthState =
  | "value"
  | "not_configured"
  | "not_assessed"
  | "unavailable"
  | "not_permitted"
  | "partial"
  | "error";

export type CockpitSource =
  | "approvals"
  | "orchestration"
  | "onboarding"
  | "offboarding"
  | "compliance"
  | "documents"
  | "imports"
  | "training"
  | "recruiting_admin"
  | "workflow_tasks"
  | "ai_reconciliation";

export type CockpitRisk =
  | "informational"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type CockpitStatus =
  | "open"
  | "waiting"
  | "due_soon"
  | "overdue"
  | "blocked"
  | "reconciliation_required"
  | "failed"
  | "completed";

export type CockpitItem = {
  id: string;
  organizationId: string;
  source: CockpitSource;
  itemType: string;
  label: string;
  status: CockpitStatus;
  risk: CockpitRisk;
  createdAtUtc: string;
  dueAtUtc?: string;
  ownerClass?: string;
  blockerCode?: string;
  routeRef?: string;
  actionRef?: string;
  sourceRef: string;
  evidenceRefs?: string[];
  downstreamBlockedCount?: number;
  complianceImpact?: boolean;
};

export type CockpitDataset = {
  source: CockpitSource;
  truthState: CockpitTruthState;
  items: CockpitItem[];
  asOfUtc: string;
  messageCode?: string;
};

export type CockpitActor = {
  uid: string;
  organizationId: string;
  roleClass: string;
};

export type CockpitPermissionChecker = (input: {
  actor: CockpitActor;
  source: CockpitSource;
  organizationId: string;
}) => Promise<boolean>;

export type CockpitAdapter = {
  source: CockpitSource;
  load(input: {
    actor: CockpitActor;
    organizationId: string;
  }): Promise<CockpitDataset>;
};

export type CockpitPriority = {
  itemId: string;
  score: number;
  band: "critical" | "high" | "medium" | "normal";
  reasons: string[];
};
