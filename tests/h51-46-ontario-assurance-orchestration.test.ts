import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildOntarioRemediationPlan,
  computeOntarioAssurance,
  evidenceOperationalStatus,
  type OntarioComplianceEvidence,
} from '@/lib/country-compliance/ontario-assurance';
import { defaultOntarioComplianceProfile } from '@/lib/country-compliance/ontario-readiness';

const profile = {
  ...defaultOntarioComplianceProfile(),
  orgType: 'private' as const,
  ontarioEmployeeCount: 25,
  ontarioEmployeesOnJan1: 25,
  jan1EmployeeCountReviewed: true,
  workplaceWorkerCount: 25,
  usesPublicJobPostings: true,
  usesAiInRecruiting: true,
};

const evidence = (overrides: Partial<OntarioComplianceEvidence> = {}): OntarioComplianceEvidence => ({
  id: 'evidence-1',
  obligationId: 'disconnecting-policy',
  title: 'Disconnecting-from-Work Policy',
  reference: 'POL-001',
  status: 'submitted',
  createdBy: 'tester',
  createdAt: '2026-09-12T12:00:00.000Z',
  updatedBy: 'tester',
  updatedAt: '2026-09-12T12:00:00.000Z',
  ...overrides,
});

describe('H51.46 Ontario assurance orchestration', () => {
  it('does not count submitted evidence as approved assurance', () => {
    const result = computeOntarioAssurance(profile, [evidence()], [], '2026-09-12');
    expect(result.approvedEvidenceCount).toBe(0);
    expect(result.pendingEvidenceCount).toBe(1);
    expect(result.assuranceReadinessPercent).toBe(0);
    expect(result.certification).toBe('NOT_CERTIFIED');
    expect(result.liveEffect).toBe('NONE');
  });

  it('counts current human-approved evidence toward assurance readiness', () => {
    const result = computeOntarioAssurance(profile, [evidence({
      status: 'approved',
      reviewerUid: 'reviewer',
      reviewedAt: '2026-09-12T13:00:00.000Z',
      reviewDueDate: '2027-03-01',
    })], [], '2026-09-12');
    expect(result.approvedEvidenceCount).toBe(1);
    expect(result.assuranceReadinessPercent).toBeGreaterThan(0);
  });

  it('expires approved evidence after its review-due date', () => {
    const record = evidence({
      status: 'approved',
      reviewerUid: 'reviewer',
      reviewedAt: '2026-01-01T13:00:00.000Z',
      reviewDueDate: '2026-03-01',
    });
    expect(evidenceOperationalStatus(record, '2026-09-12')).toBe('expired');
    const result = computeOntarioAssurance(profile, [record], [], '2026-09-12');
    expect(result.approvedEvidenceCount).toBe(0);
    expect(result.expiredEvidenceCount).toBe(1);
  });

  it('creates deterministic critical remediation tasks for overdue obligations', () => {
    const plan = buildOntarioRemediationPlan(profile, [], [], '2026-09-12');
    const task = plan.find((item) => item.obligationId === 'disconnecting-policy');
    expect(task?.id).toBe('ontario-disconnecting-policy');
    expect(task?.priority).toBe('critical');
    expect(task?.status).toBe('open');
  });

  it('completes a remediation task only when current approved evidence exists', () => {
    const plan = buildOntarioRemediationPlan(profile, [evidence({
      status: 'approved',
      reviewerUid: 'reviewer',
      reviewedAt: '2026-09-12T13:00:00.000Z',
      reviewDueDate: '2027-03-01',
    })], [], '2026-09-12');
    const task = plan.find((item) => item.obligationId === 'disconnecting-policy');
    expect(task?.status).toBe('complete');
    expect(task?.completionReason).toBe('approved_evidence');
  });

  it('preserves in-progress or blocked task state while evidence is unresolved', () => {
    const plan = buildOntarioRemediationPlan(profile, [], [{
      id: 'ontario-disconnecting-policy',
      obligationId: 'disconnecting-policy',
      label: 'Written policy on disconnecting from work',
      owner: 'People & Culture',
      sourceId: 'ON-ESA-DISCONNECT',
      nextAction: 'Review',
      priority: 'critical',
      status: 'blocked',
    }], '2026-09-12');
    expect(plan.find((item) => item.obligationId === 'disconnecting-policy')?.status).toBe('blocked');
  });

  it('closes tasks as not applicable when the authoritative profile changes', () => {
    const below = { ...profile, ontarioEmployeesOnJan1: 24 };
    const plan = buildOntarioRemediationPlan(below, [], [], '2026-09-12');
    const task = plan.find((item) => item.obligationId === 'disconnecting-policy');
    expect(task?.status).toBe('closed_not_applicable');
    expect(task?.completionReason).toBe('not_applicable');
  });

  it('forbids manual completion in the service contract', () => {
    const service = readFileSync('src/lib/country-compliance/ontario-assurance-service.ts', 'utf8');
    expect(service).toContain("['open', 'in_progress', 'blocked']");
    expect(service).toContain('Completion requires approved evidence');
    expect(service).not.toContain("['open', 'in_progress', 'blocked', 'complete']");
  });

  it('exposes governed evidence and task orchestration in the Ontario UI', () => {
    const ui = readFileSync('src/components/ontario-compliance-assurance.tsx', 'utf8');
    expect(ui).toContain('Ontario Evidence Assurance & Remediation');
    expect(ui).toContain('Create / refresh remediation tasks');
    expect(ui).toContain('Submit evidence for review');
    expect(ui).toContain('Approve');
    expect(ui).toContain('Evidence approval is an internal assurance control, not legal certification');
  });

  it('keeps assurance isolated from operational payroll and employment decisions', () => {
    const service = readFileSync('src/lib/country-compliance/ontario-assurance-service.ts', 'utf8');
    const payroll = readFileSync('src/components/payroll-workspace.tsx', 'utf8');
    expect(service).not.toContain('payrollRuns');
    expect(service).not.toContain('leaveBalances');
    expect(service).not.toContain('governmentSubmissions');
    expect(payroll).not.toContain('OntarioComplianceAssurance');
    expect(payroll).not.toContain('OntarioComplianceReadiness');
  });
});