export const EVIDENCE_REQUIREMENTS = {
  CODE_OF_CONDUCT_CURRENT: "policy.code_of_conduct.current",
  HARASSMENT_VIOLENCE_POLICY_CURRENT: "policy.harassment_violence.current",
  REQUIRED_POLICY_ACKNOWLEDGEMENTS: "acknowledgement.required_policy_completion",
  MANDATORY_TRAINING_COMPLETION: "training.mandatory_completion",
  OPEN_COMPLIANCE_TASKS: "compliance.open_required_tasks",
  CONTROLLED_DOCUMENT_VERSIONS: "document.controlled_versions",
  DOCUMENT_SECURITY_EXCEPTIONS: "document.security_exceptions",
  REQUIRED_INCIDENT_RECORDS: "incident.required_records",
  PRODUCTION_CERTIFICATION: "release.production_certification",
  AUTHENTICATED_UAT: "release.authenticated_uat",
  BACKUP_RESTORE_TEST: "operations.backup_restore_test",
  DR_EXERCISE: "operations.dr_exercise",
  MONITORING_SLO: "operations.monitoring_slo",
  AI_QUALITY_GATE: "ai.quality_gate",
  AI_GOVERNANCE_REVIEW: "ai.governance_review",
} as const;

export type EvidenceRequirementKey =
  typeof EVIDENCE_REQUIREMENTS[keyof typeof EVIDENCE_REQUIREMENTS];

export const EVIDENCE_REQUIREMENT_SET = new Set<string>(
  Object.values(EVIDENCE_REQUIREMENTS)
);
