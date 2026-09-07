export type H50ClosureEvidenceClass =
  | 'software'
  | 'functional_uat'
  | 'telemetry'
  | 'external_assurance';

export interface H50ClosureArea {
  id: string;
  name: string;
  deliveryClass: H50ClosureEvidenceClass;
  sourceImplementationReady: boolean;
  evidenceStillRequired: boolean;
  notes: string;
}

export const h50ClosureAreas: readonly H50ClosureArea[] = [
  {
    id: 'enterprise-graph-breadth',
    name: 'Enterprise Object Graph breadth',
    deliveryClass: 'software',
    sourceImplementationReady: true,
    evidenceStillRequired: true,
    notes: 'H50 adds required object vocabulary, relationship quality and coverage reporting; live domain population still requires UAT evidence.',
  },
  {
    id: 'knowledge-skills-compliance',
    name: 'Knowledge, skills and compliance graph breadth',
    deliveryClass: 'software',
    sourceImplementationReady: true,
    evidenceStillRequired: true,
    notes: 'H50 adds evidence/confidence/freshness-aware graph contracts and impact functions.',
  },
  {
    id: 'agent-registry-risk',
    name: 'Agent Registry telemetry and multi-factor Action Risk Score',
    deliveryClass: 'software',
    sourceImplementationReady: true,
    evidenceStillRequired: true,
    notes: 'Five initial agents and risk factors are codified; evaluation/red-team evidence must be captured in UAT.',
  },
  {
    id: 'outcome-orchestration',
    name: 'Approved-hire outcome orchestration',
    deliveryClass: 'functional_uat',
    sourceImplementationReady: true,
    evidenceStillRequired: true,
    notes: 'Full roadmap onboarding step plan is generated without allowing AI to make the hiring decision.',
  },
  {
    id: 'process-studio',
    name: 'Full AI HR Process Generator artifact bundle and lifecycle',
    deliveryClass: 'functional_uat',
    sourceImplementationReady: true,
    evidenceStillRequired: true,
    notes: 'H50 generates form, rules, approvals, SLA, notifications, evidence, dashboard and reporting and enforces simulation/test/UAT/review/approval/promotion states.',
  },
  {
    id: 'digital-twin-impact',
    name: 'Digital Twin downstream proposals and Impact Preview',
    deliveryClass: 'functional_uat',
    sourceImplementationReady: true,
    evidenceStillRequired: true,
    notes: 'Scenario proposals remain proposal-only until authorized humans approve downstream actions.',
  },
  {
    id: 'proactive-ops',
    name: 'Proactive Human Operations coverage and usefulness measurement',
    deliveryClass: 'telemetry',
    sourceImplementationReady: true,
    evidenceStillRequired: true,
    notes: 'All roadmap detection types are modeled; live precision/usefulness must be measured.',
  },
  {
    id: 'talent-feedback',
    name: 'Quality-of-hire feedback',
    deliveryClass: 'software',
    sourceImplementationReady: true,
    evidenceStillRequired: true,
    notes: 'Aggregated feedback is protected-trait safe and can never make an automatic hiring decision.',
  },
  {
    id: 'payroll-control-tower',
    name: 'Payroll Control Tower',
    deliveryClass: 'functional_uat',
    sourceImplementationReady: true,
    evidenceStillRequired: true,
    notes: 'Unified preflight/anomaly/variance controls are coded; provider, GL and payslip integrations require configured UAT.',
  },
  {
    id: 'integration-fabric',
    name: 'Integration Fabric protocol coverage',
    deliveryClass: 'functional_uat',
    sourceImplementationReady: true,
    evidenceStillRequired: true,
    notes: 'Operational, contract and external-configuration states are explicit; no protocol is falsely claimed deployed.',
  },
  {
    id: 'marketplace-packs',
    name: 'First-party industry packs',
    deliveryClass: 'functional_uat',
    sourceImplementationReady: true,
    evidenceStillRequired: true,
    notes: 'Six controlled first-party pack manifests are present in draft status pending UAT.',
  },
  {
    id: 'explainability',
    name: 'Explainable AI metadata completeness',
    deliveryClass: 'functional_uat',
    sourceImplementationReady: true,
    evidenceStillRequired: true,
    notes: 'Recommendation, confidence, evidence, sources, assumptions, missing information, policy basis, freshness, model/version, alternatives and reviewer are standardized.',
  },
  {
    id: 'trust-assurance',
    name: 'Enterprise trust and external assurance',
    deliveryClass: 'external_assurance',
    sourceImplementationReady: true,
    evidenceStillRequired: true,
    notes: 'Control register distinguishes implemented technical controls from external assurance obligations such as penetration testing and certifications.',
  },
  {
    id: 'reliability-slos',
    name: 'Reliability SLO proof',
    deliveryClass: 'telemetry',
    sourceImplementationReady: true,
    evidenceStillRequired: true,
    notes: 'Roadmap SLO thresholds are executable; measured service evidence is still required.',
  },
  {
    id: 'mobile-voice',
    name: 'Mobile and Voice breadth',
    deliveryClass: 'functional_uat',
    sourceImplementationReady: true,
    evidenceStillRequired: true,
    notes: 'Roadmap mobile features and common voice intents are registered; real device/audio UAT remains required.',
  },
  {
    id: 'benchmark-program',
    name: 'Permanent benchmark and human-effort proof',
    deliveryClass: 'telemetry',
    sourceImplementationReady: true,
    evidenceStillRequired: true,
    notes: 'Benchmark target evaluation and OPSIQO-vs-legacy human task comparison are executable.',
  },
] as const;

export function h50ClosureSummary(): {
  totalAreas: number;
  sourceImplementationReady: number;
  evidenceStillRequired: number;
  byClass: Record<H50ClosureEvidenceClass, number>;
} {
  const byClass: Record<H50ClosureEvidenceClass, number> = {
    software: 0,
    functional_uat: 0,
    telemetry: 0,
    external_assurance: 0,
  };

  for (const area of h50ClosureAreas) {
    byClass[area.deliveryClass] += 1;
  }

  return {
    totalAreas: h50ClosureAreas.length,
    sourceImplementationReady: h50ClosureAreas.filter(
      (area) => area.sourceImplementationReady,
    ).length,
    evidenceStillRequired: h50ClosureAreas.filter(
      (area) => area.evidenceStillRequired,
    ).length,
    byClass,
  };
}
