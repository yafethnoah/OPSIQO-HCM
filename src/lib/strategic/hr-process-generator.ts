import { classifyStrategicAction } from './agent-os';
import type { StrategicRiskTier } from './types';

export type GeneratedProcessStepType =
  | 'task'
  | 'approval'
  | 'notification'
  | 'specialist_review';

export interface GeneratedHrProcessStep {
  id: string;
  name: string;
  type: GeneratedProcessStepType;
  ownerRole: string;
  dependsOn: string[];
  authoritativeServiceHint?: string;
  humanDecisionRequired?: boolean;
}

export interface GeneratedHrProcessDraft {
  name: string;
  description: string;
  status: 'draft';
  enabled: false;
  source: 'natural_language';
  processKind:
    | 'onboarding'
    | 'leave'
    | 'recruiting'
    | 'performance'
    | 'learning'
    | 'separation'
    | 'generic';
  maximumRiskTier: StrategicRiskTier;
  activation: 'human_review_required';
  steps: GeneratedHrProcessStep[];
  safeguards: string[];
  assumptions: string[];
}

export function generateHrProcessDraft(
  rawPrompt: string,
): GeneratedHrProcessDraft {
  const prompt = normalizePrompt(rawPrompt);
  const processKind = classifyProcess(prompt);
  const steps = processSteps(processKind);
  const maximumRiskTier = maximumStepRisk(prompt, processKind);

  const draft: GeneratedHrProcessDraft = {
    name: processName(prompt, processKind),
    description: prompt,
    status: 'draft',
    enabled: false,
    source: 'natural_language',
    processKind,
    maximumRiskTier,
    activation: 'human_review_required',
    steps,
    safeguards: [
      'Generated processes are drafts only.',
      'Activation requires an authorized human review.',
      'Every executable step must bind to an existing authoritative OPSIQO service.',
      'R4 actions require independent approval evidence.',
      'R5 employment decisions remain human decisions.',
      'R6 termination or legal actions require specialist review plus a recorded human decision.',
    ],
    assumptions: [
      'The prompt describes a workflow design request rather than authorization to execute employment actions.',
      'Existing OPSIQO permissions, schemas, audit, idempotency and tenant controls remain authoritative.',
    ],
  };

  assertGeneratedProcessSafe(draft);
  return draft;
}

export function assertGeneratedProcessSafe(
  draft: GeneratedHrProcessDraft,
): void {
  if (draft.status !== 'draft' || draft.enabled !== false) {
    throw new Error('generated HR processes must remain disabled drafts');
  }

  if (draft.activation !== 'human_review_required') {
    throw new Error('generated HR process activation requires human review');
  }

  if (draft.steps.length < 1 || draft.steps.length > 12) {
    throw new Error('generated HR process step count must be between 1 and 12');
  }

  const ids = new Set(draft.steps.map((step) => step.id));
  if (ids.size !== draft.steps.length) {
    throw new Error('generated HR process step ids must be unique');
  }

  for (const step of draft.steps) {
    if (!step.name.trim() || !step.ownerRole.trim()) {
      throw new Error('generated HR process steps require name and owner');
    }

    for (const dependency of step.dependsOn) {
      if (!ids.has(dependency)) {
        throw new Error('generated HR process dependency is invalid');
      }
    }
  }

  if (
    draft.maximumRiskTier === 'R5' ||
    draft.maximumRiskTier === 'R6'
  ) {
    if (!draft.steps.some((step) => step.humanDecisionRequired)) {
      throw new Error('R5-R6 generated processes require a human decision step');
    }
  }

  if (draft.maximumRiskTier === 'R6') {
    if (!draft.steps.some((step) => step.type === 'specialist_review')) {
      throw new Error('R6 generated processes require specialist review');
    }
  }
}

function normalizePrompt(value: string): string {
  const prompt = value.trim().replace(/\s+/g, ' ');

  if (prompt.length < 10) {
    throw new Error('HR process prompt must contain at least 10 characters');
  }

  if (prompt.length > 2000) {
    throw new Error('HR process prompt exceeds 2000 characters');
  }

  return prompt;
}

function classifyProcess(
  prompt: string,
): GeneratedHrProcessDraft['processKind'] {
  const text = prompt.toLowerCase();

  if (/(terminate|termination|separation|offboard|offboarding)/.test(text)) {
    return 'separation';
  }

  // Onboarding is more specific than generic recruiting language.
  // Prompts such as "onboard approved new hires" must not be classified
  // as recruiting merely because they contain the word "hire".
  if (
    /(onboard|onboarding|new hire|new hires|approved hire|approved hires)/.test(
      text,
    )
  ) {
    return 'onboarding';
  }

  if (/(recruit|candidate|requisition|interview|offer|hire)/.test(text)) {
    return 'recruiting';
  }

  if (/(leave|vacation|pto|time off)/.test(text)) return 'leave';

  if (/(performance|review|pip|goal|feedback)/.test(text)) {
    return 'performance';
  }

  if (/(learning|training|course|certificate|skill)/.test(text)) {
    return 'learning';
  }

  return 'generic';
}
function maximumStepRisk(
  prompt: string,
  kind: GeneratedHrProcessDraft['processKind'],
): StrategicRiskTier {
  if (kind === 'separation') return 'R6';
  if (kind === 'recruiting' && /\b(hire|reject|select)\b/i.test(prompt)) {
    return 'R5';
  }
  if (kind === 'performance' && /\b(pip|discipline|promote|demote)\b/i.test(prompt)) {
    return 'R5';
  }
  if (/\b(salary|compensation|pay change)\b/i.test(prompt)) return 'R4';

  const classified = classifyStrategicAction(prompt);
  return classified === 'R0' || classified === 'R1' || classified === 'R2'
    ? 'R3'
    : classified;
}

function processName(
  prompt: string,
  kind: GeneratedHrProcessDraft['processKind'],
): string {
  const labels: Record<GeneratedHrProcessDraft['processKind'], string> = {
    onboarding: 'Generated Onboarding Process',
    leave: 'Generated Leave Process',
    recruiting: 'Generated Recruiting Process',
    performance: 'Generated Performance Process',
    learning: 'Generated Learning Process',
    separation: 'Generated Separation Process',
    generic: 'Generated HR Process',
  };

  return `${labels[kind]} · ${prompt.slice(0, 60)}`;
}

function processSteps(
  kind: GeneratedHrProcessDraft['processKind'],
): GeneratedHrProcessStep[] {
  switch (kind) {
    case 'onboarding':
      return [
        {
          id: 'verify-hire',
          name: 'Verify approved hire evidence',
          type: 'approval',
          ownerRole: 'hr_admin',
          dependsOn: [],
          authoritativeServiceHint: 'governance.verify_hire_approval',
          humanDecisionRequired: true,
        },
        {
          id: 'prepare-onboarding',
          name: 'Prepare onboarding case',
          type: 'task',
          ownerRole: 'hr_admin',
          dependsOn: ['verify-hire'],
          authoritativeServiceHint: 'onboarding.create_prehire_case',
        },
        {
          id: 'assign-learning',
          name: 'Assign required learning',
          type: 'task',
          ownerRole: 'hr_admin',
          dependsOn: ['prepare-onboarding'],
          authoritativeServiceHint: 'learning.assign',
        },
      ];

    case 'leave':
      return [
        {
          id: 'submit-leave',
          name: 'Submit leave request',
          type: 'task',
          ownerRole: 'employee',
          dependsOn: [],
          authoritativeServiceHint: 'leave.request',
        },
        {
          id: 'review-leave',
          name: 'Review leave request',
          type: 'approval',
          ownerRole: 'manager',
          dependsOn: ['submit-leave'],
          authoritativeServiceHint: 'leave.approve_request',
          humanDecisionRequired: true,
        },
      ];

    case 'recruiting':
      return [
        {
          id: 'prepare-requisition',
          name: 'Prepare requisition',
          type: 'task',
          ownerRole: 'hr_admin',
          dependsOn: [],
          authoritativeServiceHint: 'recruiting.create_requisition',
        },
        {
          id: 'human-selection',
          name: 'Record authorized human employment decision',
          type: 'approval',
          ownerRole: 'hiring_manager',
          dependsOn: ['prepare-requisition'],
          humanDecisionRequired: true,
        },
      ];

    case 'performance':
      return [
        {
          id: 'collect-evidence',
          name: 'Collect performance evidence',
          type: 'task',
          ownerRole: 'manager',
          dependsOn: [],
        },
        {
          id: 'manager-decision',
          name: 'Record manager assessment decision',
          type: 'approval',
          ownerRole: 'manager',
          dependsOn: ['collect-evidence'],
          humanDecisionRequired: true,
        },
      ];

    case 'learning':
      return [
        {
          id: 'identify-learning',
          name: 'Identify governed learning requirement',
          type: 'task',
          ownerRole: 'hr_admin',
          dependsOn: [],
        },
        {
          id: 'assign-learning',
          name: 'Assign learning',
          type: 'task',
          ownerRole: 'hr_admin',
          dependsOn: ['identify-learning'],
          authoritativeServiceHint: 'learning.assign',
        },
      ];

    case 'separation':
      return [
        {
          id: 'specialist-review',
          name: 'Complete specialist legal/HR review',
          type: 'specialist_review',
          ownerRole: 'hr_admin',
          dependsOn: [],
          humanDecisionRequired: true,
        },
        {
          id: 'human-decision',
          name: 'Record authorized human separation decision',
          type: 'approval',
          ownerRole: 'org_admin',
          dependsOn: ['specialist-review'],
          humanDecisionRequired: true,
        },
        {
          id: 'prepare-offboarding',
          name: 'Prepare offboarding tasks after approved decision',
          type: 'task',
          ownerRole: 'hr_admin',
          dependsOn: ['human-decision'],
        },
      ];

    case 'generic':
      return [
        {
          id: 'review-request',
          name: 'Review requested HR process',
          type: 'approval',
          ownerRole: 'hr_admin',
          dependsOn: [],
          humanDecisionRequired: true,
        },
        {
          id: 'prepare-workflow',
          name: 'Prepare governed workflow draft',
          type: 'task',
          ownerRole: 'hr_admin',
          dependsOn: ['review-request'],
        },
      ];
  }
}
