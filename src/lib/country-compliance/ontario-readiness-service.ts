import type { ActorContext } from '@/domain/security';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';
import {
  assessOntarioComplianceReadiness,
  defaultOntarioComplianceProfile,
  type OntarioComplianceProfile,
  type OntarioOrgType,
} from '@/lib/country-compliance/ontario-readiness';

const now = () => new Date().toISOString();

function requireRead(actor: ActorContext) {
  if (!actor.permissions.includes('regulatory.read')) {
    throw new ApiError(403, 'Regulatory read permission required.', 'forbidden');
  }
}

function requireManage(actor: ActorContext) {
  if (!actor.permissions.includes('regulatory.manage')) {
    throw new ApiError(403, 'Regulatory management permission required.', 'forbidden');
  }
}

function nonNegativeNumber(value: unknown, label: string) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new ApiError(400, `${label} must be zero or greater.`, 'invalid_ontario_profile');
  }
  return n;
}

function orgType(value: unknown): OntarioOrgType {
  const next = String(value || 'unknown') as OntarioOrgType;
  if (!['private', 'nonprofit', 'public', 'unknown'].includes(next)) {
    throw new ApiError(400, 'Invalid Ontario organization type.', 'invalid_ontario_profile');
  }
  return next;
}

function text(value: unknown) {
  return String(value || '').trim();
}

function bool(value: unknown) {
  return value === true;
}

export async function getOntarioComplianceReadiness(actor: ActorContext) {
  requireRead(actor);
  const ref = adminDb().doc(`organizations/${actor.orgId}/ontarioComplianceProfile/current`);
  const snap = await ref.get();
  const profile: OntarioComplianceProfile = snap.exists
    ? ({ ...defaultOntarioComplianceProfile(), ...snap.data(), id: 'current' } as OntarioComplianceProfile)
    : defaultOntarioComplianceProfile();

  return {
    profile,
    assessment: assessOntarioComplianceReadiness(profile),
    canManage: actor.permissions.includes('regulatory.manage'),
  };
}

export async function saveOntarioComplianceProfile(actor: ActorContext, raw: unknown) {
  requireManage(actor);
  const input = (raw || {}) as Record<string, unknown>;
  const ref = adminDb().doc(`organizations/${actor.orgId}/ontarioComplianceProfile/current`);
  const beforeSnap = await ref.get();
  const before = beforeSnap.data();

  const after: OntarioComplianceProfile = {
    id: 'current',
    orgType: orgType(input.orgType),
    ontarioEmployeeCount: nonNegativeNumber(input.ontarioEmployeeCount, 'Ontario employee count'),
    workplaceWorkerCount: nonNegativeNumber(input.workplaceWorkerCount, 'Workplace worker count'),
    usesPublicJobPostings: bool(input.usesPublicJobPostings),
    usesAiInRecruiting: bool(input.usesAiInRecruiting),
    electronicallyMonitorsEmployees: bool(input.electronicallyMonitorsEmployees),
    usesRecruitersOrTempAgencies: bool(input.usesRecruitersOrTempAgencies),
    unionizedWorkplace: bool(input.unionizedWorkplace),
    specialRulesOrExemptionsReviewed: bool(input.specialRulesOrExemptionsReviewed),
    annualOntarioPayrollCad: nonNegativeNumber(input.annualOntarioPayrollCad, 'Annual Ontario payroll'),
    associatedGroupOntarioPayrollCad: nonNegativeNumber(input.associatedGroupOntarioPayrollCad, 'Associated-group Ontario payroll'),
    registeredCharity: bool(input.registeredCharity),
    ehtEligibleEmployerReviewed: bool(input.ehtEligibleEmployerReviewed),
    ehtEligibleEmployer: bool(input.ehtEligibleEmployer),
    disconnectingPolicyRef: text(input.disconnectingPolicyRef),
    electronicMonitoringPolicyRef: text(input.electronicMonitoringPolicyRef),
    jobPostingProcedureRef: text(input.jobPostingProcedureRef),
    aodaComplianceReportRef: text(input.aodaComplianceReportRef),
    accessibilityPlanRef: text(input.accessibilityPlanRef),
    hsrOrJhscRef: text(input.hsrOrJhscRef),
    payEquityReviewRef: text(input.payEquityReviewRef),
    recruiterLicenseReviewRef: text(input.recruiterLicenseReviewRef),
    wsibCoverageReviewRef: text(input.wsibCoverageReviewRef),
    ehtReviewRef: text(input.ehtReviewRef),
    collectiveAgreementReviewRef: text(input.collectiveAgreementReviewRef),
    specialRulesReviewRef: text(input.specialRulesReviewRef),
    updatedBy: actor.uid,
    updatedAt: now(),
  };

  await ref.set(after);

  const audit = buildAudit(actor, {
    action: 'regulatory.ontario.readiness_profile.save',
    entityType: 'ontarioComplianceProfile',
    entityId: 'current',
    before,
    after,
  });
  await adminDb().doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`).create(audit);

  return {
    profile: after,
    assessment: assessOntarioComplianceReadiness(after),
  };
}