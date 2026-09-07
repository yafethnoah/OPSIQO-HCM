import type { EvidenceRef } from './types';

export interface ComplianceObligation {
  obligationId: string;
  orgId: string;
  jurisdiction: string;
  topic: string;
  effectiveFrom: string;
  sourceAuthority: string;
  evidenceRefs: EvidenceRef[];
}

export interface ComplianceImpact {
  obligationId: string;
  orgId: string;
  impactedObjectTypes: string[];
  impactedPolicies: string[];
  impactedWorkflows: string[];
  requiredActions: string[];
  legalReviewRequired: boolean;
  confidence: number;
  evidenceRefs: EvidenceRef[];
}

export function buildComplianceImpact(input: {
  obligation: ComplianceObligation;
  impactedObjectTypes: string[];
  impactedPolicies?: string[];
  impactedWorkflows?: string[];
  requiredActions?: string[];
  confidence: number;
}): ComplianceImpact {
  if (input.obligation.evidenceRefs.length === 0) {
    throw new Error('compliance obligations require authority evidence');
  }
  if (input.confidence < 0 || input.confidence > 1) {
    throw new Error('confidence must be between 0 and 1');
  }

  return {
    obligationId: input.obligation.obligationId,
    orgId: input.obligation.orgId,
    impactedObjectTypes: [...new Set(input.impactedObjectTypes)],
    impactedPolicies: [...new Set(input.impactedPolicies ?? [])],
    impactedWorkflows: [...new Set(input.impactedWorkflows ?? [])],
    requiredActions: [...new Set(input.requiredActions ?? [])],
    legalReviewRequired: input.requiredActions?.some((action) =>
      /(termination|discipline|legal|collective agreement)/i.test(action),
    ) ?? false,
    confidence: input.confidence,
    evidenceRefs: input.obligation.evidenceRefs,
  };
}
