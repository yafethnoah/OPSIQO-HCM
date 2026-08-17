import { describe, expect, it } from "vitest";
import { evaluateExperimentEligibility } from "../../src/lib/experimentation/eligibility";
import type { ExperimentProposal } from "../../src/lib/experimentation/types";

const base: ExperimentProposal = {
  id: "EXP-1",
  title: "Home card order",
  domain: "dashboard_layout",
  changesAuthorization: false,
  changesTenantIsolation: false,
  changesComplianceOutcome: false,
  changesPrivacyConsent: false,
  changesIndividualHrDecision: false,
  changesCompensationOrPayroll: false,
  changesLeaveEntitlement: false,
  changesHealthSafetyControl: false,
  changesDocumentSecurity: false,
  changesBackupOrRestore: false,
  changesConsequentialAiBehavior: false,
  changesIdempotencyOrReconciliation: false,
  analyticsApproved: false,
  consentReviewed: false,
  requestedMode: "rollout_only",
};

describe("experiment eligibility", () => {
  it("allows a non-consequential rollout", () => {
    expect(evaluateExperimentEligibility(base).eligibility).toBe("eligible_rollout");
  });

  it("prohibits authorization experiments", () => {
    const result = evaluateExperimentEligibility({
      ...base,
      domain: "authorization",
      changesAuthorization: true,
    });
    expect(result.eligibility).toBe("prohibited");
    expect(result.allowedMode).toBe("disabled");
  });

  it("prohibits consequential AI experiments", () => {
    const result = evaluateExperimentEligibility({
      ...base,
      domain: "ai_consequential",
      changesConsequentialAiBehavior: true,
    });
    expect(result.eligibility).toBe("prohibited");
  });

  it("requires Analytics approval and consent review for A/B testing", () => {
    const result = evaluateExperimentEligibility({
      ...base,
      requestedMode: "ab_test",
    });
    expect(result.eligibility).toBe("review_required");
    expect(result.allowedMode).toBe("rollout_only");
  });

  it("allows approved non-consequential A/B testing", () => {
    const result = evaluateExperimentEligibility({
      ...base,
      requestedMode: "ab_test",
      analyticsApproved: true,
      consentReviewed: true,
    });
    expect(result.eligibility).toBe("eligible_ab_test");
  });
});
