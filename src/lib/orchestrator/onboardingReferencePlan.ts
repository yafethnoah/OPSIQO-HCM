import type { OrchestrationPlan, OrchestrationStep } from "./types";

function step(
  id: string,
  title: string,
  dependencies: string[],
  authoritativeService: string,
  permission: string,
  options: Partial<OrchestrationStep> = {}
): OrchestrationStep {
  return {
    id,
    title,
    dependencies,
    authoritativeService,
    permission,
    riskClass: "high_impact_admin",
    state: "waiting",
    confirmationRequired: false,
    idempotencyRequired: true,
    ...options,
  };
}

export function buildApprovedEmployeeOnboardingPlan(input: {
  planId: string;
  organizationId: string;
  actorUid: string;
  createdAtUtc: string;
  authorizationExpiresAtUtc: string;
  hireApprovalEvidenceRef: string;
  employeePayloadRef: string;
  assignmentPayloadRef: string;
}): OrchestrationPlan {
  return {
    planId: input.planId,
    organizationId: input.organizationId,
    actorUid: input.actorUid,
    goalCode: "onboard_approved_employee",
    state: "draft",
    createdAtUtc: input.createdAtUtc,
    authorizationExpiresAtUtc: input.authorizationExpiresAtUtc,
    version: 1,
    evidenceRefs: [input.hireApprovalEvidenceRef],
    steps: [
      step(
        "verify_approved_hire",
        "Verify approved-hire evidence",
        [],
        "governance.verify_hire_approval",
        "onboarding.plan.prepare",
        {
          riskClass: "read_only",
          idempotencyRequired: false,
          evidenceRefs: [input.hireApprovalEvidenceRef],
        }
      ),
      step(
        "create_employee",
        "Create employee record",
        ["verify_approved_hire"],
        "core_hr.create_employee",
        "employee.create",
        {
          confirmationRequired: true,
          humanCheckpoint: true,
          payloadRef: input.employeePayloadRef,
        }
      ),
      step(
        "create_assignment",
        "Create employment assignment",
        ["create_employee"],
        "core_hr.create_assignment",
        "assignment.create",
        {
          payloadRef: input.assignmentPayloadRef,
        }
      ),
      step(
        "create_onboarding_case",
        "Create onboarding case",
        ["create_assignment"],
        "onboarding.create_case",
        "onboarding.case.create"
      ),
      step(
        "manager_checklist",
        "Create manager onboarding checklist",
        ["create_onboarding_case"],
        "workflow.create_manager_tasks",
        "workflow.task.create"
      ),
      step(
        "equipment_request",
        "Create equipment request",
        ["create_onboarding_case"],
        "equipment.create_request",
        "equipment.request.create",
        { optional: true }
      ),
      step(
        "policy_acknowledgements",
        "Assign policy acknowledgements",
        ["create_onboarding_case"],
        "documents.assign_acknowledgements",
        "documents.acknowledgement.assign"
      ),
      step(
        "mandatory_training",
        "Assign mandatory training",
        ["create_onboarding_case"],
        "lms.assign_training",
        "training.assignment.create"
      ),
      step(
        "payroll_setup_checklist",
        "Prepare payroll setup checklist",
        ["create_assignment"],
        "payroll.prepare_setup_checklist",
        "payroll.checklist.prepare",
        {
          humanCheckpoint: true,
          confirmationRequired: true,
        }
      ),
      step(
        "schedule_30_day_followup",
        "Schedule 30-day follow-up",
        [
          "create_onboarding_case",
          "manager_checklist",
          "policy_acknowledgements",
          "mandatory_training",
        ],
        "followup.schedule",
        "followup.create"
      ),
    ],
  };
}
