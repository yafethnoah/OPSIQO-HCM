import { describe, expect, it } from 'vitest';
import { AUTOMATION_CATALOG, AUTOMATED_CAPABILITY_COUNT, HUMAN_APPROVAL_BOUNDARY_COUNT } from '@/lib/automation/catalog';
import { WORKFLOW_TRIGGER_OPTIONS, WORKFLOW_TRIGGER_VALUES } from '@/domain/workflow';
import { workflowDefinitionCreateSchema } from '@/lib/workflow/schemas';

describe('OPSIQO 8.5 V7.7 automation governance', () => {
  it('catalogues broad automation coverage with explicit human boundaries', () => {
    expect(AUTOMATED_CAPABILITY_COUNT).toBeGreaterThanOrEqual(20);
    expect(HUMAN_APPROVAL_BOUNDARY_COUNT).toBeGreaterThanOrEqual(5);
    const humans = AUTOMATION_CATALOG.filter(item => item.boundary === 'human_required').map(item => item.id);
    expect(humans).toContain('consequential_employment');
    expect(humans).toContain('individual_pay_decision');
    expect(humans).toContain('succession_selection');
    expect(humans).toContain('policy_publication');
    expect(humans).toContain('privileged_access');
  });

  it('keeps ATS as governed assistance rather than autonomous employment action', () => {
    const ats = AUTOMATION_CATALOG.find(item => item.id === 'ats_assist');
    expect(ats?.boundary).toBe('opt_in_assist');
    expect(ats?.description.toLowerCase()).toContain('never hires');
  });

  it('keeps workflow trigger UI and validation on the same authoritative values', () => {
    expect(WORKFLOW_TRIGGER_OPTIONS.map(option => option.value)).toEqual([...WORKFLOW_TRIGGER_VALUES]);
    for (const trigger of WORKFLOW_TRIGGER_VALUES) {
      const parsed = workflowDefinitionCreateSchema.safeParse({
        name: 'Automation test',
        trigger,
        enabled: true,
        steps: [
          {
            id: 'test-step',
            name: 'Test step',
            type: 'task',
            dependsOn: [],
          },
        ],
      });
      expect(parsed.success, trigger).toBe(true);
    }
  });

  it('includes newly governable triggers used by automated processors', () => {
    expect(WORKFLOW_TRIGGER_VALUES).toContain('policy.reattestation_started');
    expect(WORKFLOW_TRIGGER_VALUES).toContain('governance.source_review_due');
    expect(WORKFLOW_TRIGGER_VALUES).toContain('ai.action_plan_approved');
    expect(WORKFLOW_TRIGGER_VALUES).toContain('diagnostic.assessment_approved');
  });
});
