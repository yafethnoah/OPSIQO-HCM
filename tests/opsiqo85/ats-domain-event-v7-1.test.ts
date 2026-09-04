import { describe, expect, it } from 'vitest';
import { workflowDefinitionCreateSchema } from '@/lib/workflow/schemas';
import type { DomainEventType } from '@/domain/automation';

describe('V7.1 ATS workflow event contract', () => {
  it('accepts ATS review completed as a typed domain event', () => {
    const event: DomainEventType = 'recruiting.ats_review_completed';
    expect(event).toBe('recruiting.ats_review_completed');
  });

  it('accepts ATS review completed as a workflow trigger', () => {
    const parsed = workflowDefinitionCreateSchema.parse({
      name: 'Recruiter follow-up after ATS review',
      trigger: 'recruiting.ats_review_completed',
      enabled: true,
      steps: [{ id: 'review', name: 'Human recruiter review', type: 'task', ownerRole: 'hr_admin', dependsOn: [] }],
    });
    expect(parsed.trigger).toBe('recruiting.ats_review_completed');
  });
});
