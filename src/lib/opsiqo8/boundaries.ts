/**
 * OPSIQO 8.x integration boundary.
 *
 * The 8.x libraries are installed into the real project, but consequential writes
 * remain owned by existing authoritative services. This file deliberately does not
 * fabricate wrappers for unknown signatures.
 */
export const OPSIQO_8_INTEGRATION_BOUNDARIES = {
  browserOrgIdIsAuthorization: false,
  directConsequentialAiFirestoreWrite: false,
  executionPermissionRecheckRequired: true,
  uncertainWriteRequiresReconciliation: true,
  workflowProgressMustBeAuthoritative: true,
  invitationTokenSecurityMustBePreserved: true,
  individualWorkforceScoringEnabled: false,
  complianceEvidenceShadowRepositoryEnabled: false,
} as const;
