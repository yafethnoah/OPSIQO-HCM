export type EvidenceCategory =
  | "policy"
  | "acknowledgement"
  | "training"
  | "compliance_obligation"
  | "compliance_task"
  | "controlled_document"
  | "incident"
  | "audit"
  | "release_evidence"
  | "operational_evidence"
  | "security_evidence"
  | "backup_restore_evidence"
  | "ai_governance_evidence"
  | "uat_evidence"
  | "retention_record"
  | "legal_hold_record";

export type EvidenceState =
  | "present"
  | "present_partial"
  | "missing"
  | "not_required"
  | "not_assessed"
  | "not_configured"
  | "unavailable"
  | "not_permitted"
  | "expired"
  | "superseded"
  | "legal_hold"
  | "error";

export type LegalHoldState =
  | "none"
  | "active"
  | "released";

export type EvidenceLineage = {
  sourceKey: string;
  sourceSystem: string;
  authoritative: boolean;
  sourceRef: string;
  versionRef?: string;
  integritySha256?: string;
  observedAtUtc: string;
  evidenceRefs?: string[];
};

export type EvidenceItem = {
  id: string;
  organizationId: string;
  requirementKey: string;
  category: EvidenceCategory;
  state: EvidenceState;
  label: string;
  sourceRef: string;
  ownerClass?: string;
  effectiveAtUtc?: string;
  reviewAtUtc?: string;
  expiresAtUtc?: string;
  retentionClass?: string;
  retentionUntilUtc?: string;
  legalHoldState: LegalHoldState;
  integritySha256?: string;
  supersededByRef?: string;
  routeRef?: string;
  actionRef?: string;
  messageCode?: string;
  lineage: EvidenceLineage[];
};

export type EvidenceDataset = {
  requirementKey: string;
  state: EvidenceState;
  items: EvidenceItem[];
  asOfUtc: string;
  messageCode?: string;
};

export type EvidenceActor = {
  uid: string;
  organizationId: string;
  roleClass: string;
};

export type EvidenceAdapter = {
  key: string;
  requirementKeys: string[];
  load(input: {
    actor: EvidenceActor;
    organizationId: string;
    requirementKey: string;
  }): Promise<EvidenceDataset>;
};

export type EvidencePermissionChecker = (input: {
  actor: EvidenceActor;
  organizationId: string;
  requirementKey: string;
}) => Promise<boolean>;

export type RetentionRule = {
  retentionClass: string;
  description: string;
  durationDays: number | null;
  disposition: "review" | "delete_if_permitted" | "archive";
  approved: boolean;
};

export type RetentionDecision = {
  eligibleForDisposition: boolean;
  mustPreserve: boolean;
  reason:
    | "LEGAL_HOLD_ACTIVE"
    | "RETENTION_NOT_REACHED"
    | "RETENTION_REACHED_REVIEW"
    | "RETENTION_REACHED_DELETE_IF_PERMITTED"
    | "RETENTION_REACHED_ARCHIVE"
    | "RETENTION_RULE_NOT_APPROVED"
    | "RETENTION_DATE_UNKNOWN";
};
