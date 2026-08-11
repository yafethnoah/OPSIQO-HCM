import { describe, expect, it } from 'vitest';
import { workflowDefinitionCreateSchema } from '../src/lib/workflow/schemas';

describe('workflow validation', () => {
  it('accepts valid dependency chains', () => {
    const result = workflowDefinitionCreateSchema.safeParse({
      name: 'Review', trigger: 'manual', enabled: true,
      steps: [
        { id: 'review', name: 'Review', type: 'task', dependsOn: [] },
        { id: 'approve', name: 'Approve', type: 'approval', dependsOn: ['review'] },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown dependencies', () => {
    const result = workflowDefinitionCreateSchema.safeParse({
      name: 'Broken', trigger: 'manual', enabled: true,
      steps: [{ id: 'approve', name: 'Approve', type: 'approval', dependsOn: ['missing'] }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects circular dependencies', () => {
    const result = workflowDefinitionCreateSchema.safeParse({
      name: 'Cycle', trigger: 'manual', enabled: true,
      steps: [
        { id: 'a', name: 'A', type: 'task', dependsOn: ['b'] },
        { id: 'b', name: 'B', type: 'task', dependsOn: ['a'] },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('accepts SLA escalation configuration', () => {
    const result = workflowDefinitionCreateSchema.safeParse({
      name: 'SLA Review', trigger: 'employee.updated', enabled: true,
      steps: [
        { id: 'review', name: 'Review', type: 'task', ownerRole: 'hr_admin', dueInDays: 1, escalationOwnerRole: 'org_admin', escalateAfterHours: 4, dependsOn: [] },
      ],
    });
    expect(result.success).toBe(true);
  });

});
