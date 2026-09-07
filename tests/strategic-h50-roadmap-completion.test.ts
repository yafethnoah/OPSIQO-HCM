import { describe, expect, it } from 'vitest';
import type { EnterpriseObject } from '../src/lib/strategic/enterprise-object-graph';
import type { EvidenceRef } from '../src/lib/strategic/types';
import {
  buildH50EnterpriseGraphSnapshot,
  h50GraphCoverage,
  h50InitialAgentRegistry,
  recordH50AgentEvaluation,
  scoreH50ActionRisk,
  assertH50ExplainableOutput,
} from '../src/lib/strategic/h50-foundation';
import {
  buildH50SkillAssertion,
  buildH50SkillDevelopmentPath,
  assessH50ComplianceChange,
  compareH50WorkforceAlternative,
  buildH50ImpactPreview,
} from '../src/lib/strategic/h50-intelligence';
import {
  buildH50ProcessPackage,
  transitionH50ProcessPackage,
  buildH50ApprovedHireOnboardingPlan,
  h50OnboardingProgress,
  buildH50ProactiveFinding,
  summarizeH50QualityOfHire,
} from '../src/lib/strategic/h50-operations';
import {
  assessH50MigrationReadiness,
  buildH50ZeroConfigProposal,
  buildH50PayrollPreflight,
  h50IntegrationCapabilities,
  h50FirstPartyIndustryPacks,
  h50TrustControls,
  evaluateH50Reliability,
  h50MobileFeatures,
  classifyH50VoiceIntent,
  evaluateH50HumanBenchmark,
  buildH50BenchmarkReport,
} from '../src/lib/strategic/h50-platform';
import {
  h50ClosureAreas,
  h50ClosureSummary,
} from '../src/lib/strategic/h50-closure';
import { mayAutonomouslyExecute } from '../src/lib/strategic/agent-os';

const evidence: EvidenceRef = {
  id: 'evidence-1',
  sourceType: 'test',
  sourceId: 'source-1',
  observedAt: '2026-09-07T00:00:00Z',
};

function object(type: string): EnterpriseObject {
  return {
    meta: {
      objectId: `${type}-1`,
      orgId: 'org-1',
      objectType: type,
      lifecycleStatus: 'active',
      effectiveFrom: '2026-09-01T00:00:00Z',
      effectiveTo: null,
      version: 1,
      etag: `${type}-etag-1`,
      schemaVersion: 1,
      evidenceRefs: [evidence],
      createdAt: '2026-09-01T00:00:00Z',
      createdBy: { actorType: 'user', actorId: 'user-1' },
      updatedAt: '2026-09-01T00:00:00Z',
      updatedBy: { actorType: 'user', actorId: 'user-1' },
    },
    data: {},
  };
}

describe('H50 detailed roadmap completion', () => {
  it('measures Enterprise Object Graph breadth without hiding missing types', () => {
    const snapshot = buildH50EnterpriseGraphSnapshot({
      orgId: 'org-1',
      generatedAt: '2026-09-07T00:00:00Z',
      objects: [object('organization'), object('worker'), object('position')],
      relationships: [],
    });

    const coverage = h50GraphCoverage(snapshot);

    expect(coverage.presentTypes).toContain('worker');
    expect(coverage.missingTypes.length).toBeGreaterThan(0);
    expect(coverage.coveragePercent).toBeLessThan(100);
  });

  it('registers the five initial controlled agents', () => {
    expect(h50InitialAgentRegistry).toHaveLength(5);
    expect(h50InitialAgentRegistry.map((agent) => agent.agentId)).toEqual([
      'hr-concierge',
      'hr-operations',
      'onboarding',
      'compliance',
      'analytics',
    ]);
  });

  it('records agent evaluation telemetry without inventing it in advance', () => {
    expect(h50InitialAgentRegistry[0]?.telemetry.evaluationScore).toBeUndefined();

    const evaluated = recordH50AgentEvaluation(h50InitialAgentRegistry[0]!, {
      score: 96,
      successRate: 98,
      failureRate: 2,
      humanOverrideRate: 5,
      p95LatencyMs: 900,
      evaluatedAt: '2026-09-07T00:00:00Z',
    });

    expect(evaluated.telemetry.evaluationScore).toBe(96);
  });

  it('never lets a low numerical score underclassify termination', () => {
    const result = scoreH50ActionRisk('terminate employee', {
      dataSensitivity: 0,
      financialImpact: 0,
      employmentImpact: 0,
      legalImpact: 0,
      reversibility: 1,
      scope: 0,
      confidence: 1,
      novelty: 0,
    });

    expect(result.hardPolicyTier).toBe('R6');
    expect(result.finalTier).toBe('R6');
    expect(result.requiredControl).toBe('specialist-review');
  });

  it('uses all roadmap action-risk factors', () => {
    const result = scoreH50ActionRisk('bulk sensitive compensation review', {
      dataSensitivity: 0.9,
      financialImpact: 0.9,
      employmentImpact: 0.7,
      legalImpact: 0.5,
      reversibility: 0.2,
      scope: 0.8,
      confidence: 0.5,
      novelty: 0.6,
    });

    expect(Object.keys(result.contributions).sort()).toEqual(
      [
        'confidence',
        'dataSensitivity',
        'employmentImpact',
        'financialImpact',
        'legalImpact',
        'novelty',
        'reversibility',
        'scope',
      ].sort(),
    );
    expect(result.finalTier).toMatch(/^R[0-6]$/);
  });

  it('enforces complete material AI explainability metadata', () => {
    const output = assertH50ExplainableOutput({
      output: { recommendation: 'review' },
      recommendation: 'Review the policy impact before change.',
      confidence: 0.9,
      evidenceRefs: [evidence],
      sourceReferences: ['policy:leave:v3'],
      assumptions: ['Current policy version is authoritative.'],
      limitations: ['No legal conclusion is made.'],
      missingInformation: [],
      policyBasis: ['Leave policy v3'],
      dataFreshness: {
        asOf: '2026-09-07T00:00:00Z',
        status: 'current',
      },
      alternatives: ['Keep current policy.'],
      humanReviewer: 'hr-reviewer',
      model: {
        provider: 'configured-provider',
        model: 'configured-model',
        version: 'configured-version',
      },
      generatedAt: '2026-09-07T00:00:00Z',
    });

    expect(output.policyBasis).toHaveLength(1);
  });

  it('builds evidence-backed skills and a development path', () => {
    const skill = buildH50SkillAssertion({
      orgId: 'org-1',
      workerId: 'worker-1',
      skillId: 'skill-a',
      skillName: 'HR Analytics',
      evidence: [
        {
          source: 'learning',
          evidenceRef: evidence,
          confidence: 0.9,
          sourceQuality: 'verified',
          observedAt: '2026-09-07T00:00:00Z',
        },
      ],
      adjacentSkillIds: ['skill-b'],
    });

    const path = buildH50SkillDevelopmentPath({
      workerId: 'worker-1',
      currentSkillId: 'skill-a',
      targetSkillId: 'skill-c',
      adjacency: {
        'skill-a': ['skill-b'],
        'skill-b': ['skill-c'],
      },
      evidenceRefs: [evidence],
      confidence: 0.8,
    });

    expect(skill.confidence).toBeGreaterThan(0);
    expect(path.path).toEqual(['skill-a', 'skill-b', 'skill-c']);
    expect(path.humanReviewRequired).toBe(true);
  });

  it('creates compliance impact and remediation without making a legal conclusion', () => {
    const result = assessH50ComplianceChange(
      {
        orgId: 'org-1',
        nodes: [
          {
            id: 'law-1',
            orgId: 'org-1',
            kind: 'law',
            label: 'Law',
            evidenceRefs: [evidence],
          },
          {
            id: 'policy-1',
            orgId: 'org-1',
            kind: 'policy',
            label: 'Policy',
            evidenceRefs: [evidence],
          },
        ],
        edges: [
          {
            id: 'edge-1',
            orgId: 'org-1',
            fromId: 'law-1',
            toId: 'policy-1',
            relationship: 'governs',
            evidenceRefs: [evidence],
          },
        ],
      },
      'law-1',
    );

    expect(result.affectedNodeIds).toContain('policy-1');
    expect(result.legalConclusionMade).toBe(false);
  });

  it('turns Digital Twin outcomes into proposals, not direct workforce actions', () => {
    const comparison = compareH50WorkforceAlternative(
      {
        orgId: 'org-1',
        headcount: 100,
        positions: 105,
        vacancies: 5,
        payrollCost: 1000000,
        contractorCost: 100000,
        overtimeHours: 500,
        hiringDemand: 5,
        spanOfControl: 7,
        successionCoverage: 80,
        turnoverRisk: 10,
        criticalSkillCoverage: 85,
      },
      {
        id: 'scenario-1',
        label: 'Hire externally',
        strategy: 'external_hire',
        proposed: {
          orgId: 'org-1',
          headcount: 105,
          positions: 105,
          vacancies: 0,
          payrollCost: 1100000,
          contractorCost: 50000,
          overtimeHours: 300,
          hiringDemand: 0,
          spanOfControl: 7,
          successionCoverage: 80,
          turnoverRisk: 9,
          criticalSkillCoverage: 90,
        },
        assumptions: ['Budget approval is available.'],
        evidenceRefs: [evidence],
      },
    );

    expect(
      comparison.downstreamProposals.every(
        (proposal) => proposal.mode === 'proposal_only',
      ),
    ).toBe(true);
  });

  it('standardizes impact previews with evidence and accountable human control', () => {
    const preview = buildH50ImpactPreview({
      orgId: 'org-1',
      action: 'salary change',
      riskTier: 'R4',
      signals: [
        {
          dimension: 'budget',
          level: 'warning',
          summary: 'Annual payroll cost increases.',
          evidenceRefs: [evidence],
        },
      ],
      assumptions: ['Current salary budget is authoritative.'],
      alternatives: ['Defer change.'],
    });

    expect(preview.accountableHumanRequired).toBe(true);
  });

  it('generates the full process artifact bundle', () => {
    const packageDraft = buildH50ProcessPackage(
      'Build an onboarding process for approved new hires with training.',
    );

    expect(packageDraft.draft.processKind).toBe('onboarding');
    expect(packageDraft.form.fields.length).toBeGreaterThan(0);
    expect(packageDraft.rules.length).toBeGreaterThan(0);
    expect(packageDraft.approvals.length).toBeGreaterThan(0);
    expect(packageDraft.notifications.length).toBeGreaterThan(0);
    expect(packageDraft.evidenceRequirements.length).toBeGreaterThan(0);
    expect(packageDraft.dashboard.widgets.length).toBeGreaterThan(0);
    expect(packageDraft.reporting.metrics.length).toBeGreaterThan(0);
    expect(packageDraft.lifecycle).toBe('draft');
  });

  it('enforces simulation-test-UAT-review-approval-promotion lifecycle', () => {
    let packageDraft = buildH50ProcessPackage(
      'Build an employee equipment request workflow.',
    );

    packageDraft = transitionH50ProcessPackage(packageDraft, {
      next: 'simulated',
      evidenceRefs: [evidence],
    });
    packageDraft = transitionH50ProcessPackage(packageDraft, {
      next: 'tested',
      evidenceRefs: [evidence],
    });
    packageDraft = transitionH50ProcessPackage(packageDraft, {
      next: 'uat_reviewed',
      evidenceRefs: [evidence],
    });
    packageDraft = transitionH50ProcessPackage(packageDraft, {
      next: 'approved',
      evidenceRefs: [evidence],
      independentApprovalRecorded: true,
    });

    expect(() =>
      transitionH50ProcessPackage(packageDraft, {
        next: 'promoted',
        evidenceRefs: [evidence],
      }),
    ).toThrow(/production promotion approval/i);
  });

  it('builds the complete approved-hire onboarding outcome plan', () => {
    const plan = buildH50ApprovedHireOnboardingPlan('decision:evidence:1');

    expect(plan.directHiringDecisionMadeByAi).toBe(false);
    expect(plan.steps.map((step) => step.id)).toEqual(
      expect.arrayContaining([
        'employee-record',
        'assignment',
        'onboarding-case',
        'manager-tasks',
        'equipment',
        'policy-ack',
        'learning',
        'payroll-intake',
        'benefits',
        'followups',
      ]),
    );
    expect(h50OnboardingProgress(plan).total).toBeGreaterThanOrEqual(10);
  });

  it('models every proactive roadmap action under the risk authority model', () => {
    const finding = buildH50ProactiveFinding({
      id: 'finding-1',
      orgId: 'org-1',
      type: 'payroll_variance',
      severity: 'high',
      riskTier: 'R4',
      evidenceRefs: [evidence],
    });

    expect(finding.actionClass).toBe('approval_required');
  });

  it('keeps quality-of-hire feedback aggregated and non-decisional', () => {
    const observations = Array.from({ length: 5 }, (_, index) => ({
      orgId: 'org-1',
      workerId: `worker-${index + 1}`,
      jobFamily: 'HR',
      hiredAt: '2026-01-01T00:00:00Z',
      retainedDays: 180 + index,
      performanceRating: 4,
      evidenceRefs: [evidence],
    }));

    const summary = summarizeH50QualityOfHire(observations);

    expect(summary.sampleSize).toBe(5);
    expect(summary.automaticHiringDecisionPermitted).toBe(false);
  });

  it('builds migration readiness and keeps unresolved decisions human', () => {
    const readiness = assessH50MigrationReadiness([
      {
        kind: 'employee_data',
        confidence: 0.95,
        issues: [],
        unresolvedDecisions: ['Confirm worker classification for row 4'],
      },
      {
        kind: 'policy',
        confidence: 0.9,
        issues: [],
        unresolvedDecisions: [],
      },
    ]);

    expect(readiness.score).toBeGreaterThan(70);
    expect(readiness.humanDecisionQueue).toContain(
      'Confirm worker classification for row 4',
    );
  });

  it('creates a zero-config proposal but never auto-applies it', () => {
    const proposal = buildH50ZeroConfigProposal({
      country: 'Canada',
      industry: 'Nonprofit',
      size: 'mid_market',
      workforceModel: 'employee-and-volunteer',
      regulatoryContext: ['Ontario employment standards'],
      securityProfile: ['MFA', 'least privilege'],
      migrationSignals: [
        {
          kind: 'employee_data',
          confidence: 0.95,
          issues: [],
          unresolvedDecisions: ['Confirm volunteer manager ownership'],
        },
      ],
    });

    expect(proposal.autoApplied).toBe(false);
    expect(proposal.unresolvedDecisions).toContain(
      'Confirm volunteer manager ownership',
    );
    expect(proposal.dashboards).toContain('Needs Attention');
  });

  it('builds payroll preflight with anomaly blocking', () => {
    const result = buildH50PayrollPreflight({
      lines: [
        {
          workerId: 'worker-1',
          kind: 'time',
          hours: 80,
          approved: true,
          sourceRef: 'time:1',
        },
        {
          workerId: 'worker-2',
          kind: 'bonus',
          amount: 500,
          approved: false,
          sourceRef: 'bonus:1',
        },
      ],
    });

    expect(result.readyForApproval).toBe(false);
    expect(result.providerHandoffAllowed).toBe(false);
    expect(result.reconciliationRequired).toBe(true);
  });

  it('tracks integration protocol readiness without false deployment claims', () => {
    expect(
      h50IntegrationCapabilities.find((item) => item.protocol === 'rest')?.mode,
    ).toBe('operational');
    expect(
      h50IntegrationCapabilities.find((item) => item.protocol === 'mcp')?.mode,
    ).toBe('governed_contract');
    expect(
      h50IntegrationCapabilities.find((item) => item.protocol === 'sftp')?.mode,
    ).toBe('external_configuration_required');
  });

  it('adds six controlled first-party pack manifests with rollback metadata', () => {
    expect(h50FirstPartyIndustryPacks).toHaveLength(6);
    expect(
      h50FirstPartyIndustryPacks.every(
        (pack) =>
          pack.publisher === 'OPSIQO' &&
          pack.validationStatus === 'draft' &&
          pack.rollbackMetadata.supported,
      ),
    ).toBe(true);
  });

  it('does not falsely mark external security assurance as implemented', () => {
    expect(
      h50TrustControls.find((control) => control.id === 'penetration-test')
        ?.state,
    ).toBe('external_assurance_required');
    expect(
      h50TrustControls.find((control) => control.id === 'soc2')?.state,
    ).toBe('external_assurance_required');
  });

  it('evaluates all roadmap reliability targets', () => {
    const result = evaluateH50Reliability({
      availabilityPercent: 99.99,
      criticalApiP95Ms: 400,
      simpleAiP95Ms: 2500,
      transactionIdempotencyPercent: 100,
      tenantIsolationPassPercent: 100,
      rpoMinutes: 10,
      rtoMinutes: 45,
      consequentialAuditPercent: 100,
      reconciliationVisibilityPercent: 100,
      accessibilityWcag22Aa: true,
    });

    expect(Object.values(result).every(Boolean)).toBe(true);
  });

  it('registers the full roadmap mobile feature set', () => {
    expect(h50MobileFeatures).toEqual(
      expect.arrayContaining([
        'clock',
        'schedule',
        'shift_swap',
        'leave',
        'payslip',
        'documents',
        'announcements',
        'approvals',
        'tasks',
        'learning',
        'profile',
        'ai_assistant',
        'voice',
        'push_notifications',
        'manager_actions',
        'selective_offline',
      ]),
    );
  });

  it('classifies common voice intents without allowing direct execution', () => {
    const result = classifyH50VoiceIntent('Approve my team leave request');

    expect(result.intent).toBe('leave');
    expect(result.directExecutionPermitted).toBe(false);
  });

  it('measures human task improvement against module navigation', () => {
    const result = evaluateH50HumanBenchmark({
      task: 'request leave',
      opsiqoSeconds: 15,
      legacyNavigationSeconds: 45,
      opsiqoClicks: 2,
      legacyNavigationClicks: 7,
    });

    expect(result.faster).toBe(true);
    expect(result.fewerClicks).toBe(true);
  });

  it('preserves the permanent benchmark contract and surfaces missing observations', () => {
    const report = buildH50BenchmarkReport([
      { key: 'leave.request.seconds', value: 15 },
      { key: 'common.action.clicks', value: 2 },
      { key: 'consequential.autonomous.count', value: 0 },
    ]);

    expect(report.passed).toBeGreaterThanOrEqual(3);
    expect(report.missing).toBeGreaterThan(0);
  });

  it('marks every H50 closure area source-ready while keeping evidence gates truthful', () => {
    const summary = h50ClosureSummary();

    expect(summary.totalAreas).toBe(h50ClosureAreas.length);
    expect(summary.sourceImplementationReady).toBe(summary.totalAreas);
    expect(summary.evidenceStillRequired).toBeGreaterThan(0);
  });

  it('does not weaken H49 consequential autonomy boundaries', () => {
    expect(mayAutonomouslyExecute('R5')).toBe(false);
    expect(mayAutonomouslyExecute('R6')).toBe(false);
  });
});
