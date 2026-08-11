import { describe, expect, it } from 'vitest';
import { secondaryAssignmentCreateSchema, secondaryAssignmentEndSchema, secondaryAssignmentPlanActionSchema } from '../src/lib/hr/schemas';

const today = new Date().toISOString().slice(0, 10);

describe('secondary assignment validation', () => {
  it('accepts a valid concurrent assignment', () => {
    const result = secondaryAssignmentCreateSchema.safeParse({
      positionId: 'pos-2', orgUnitId: 'unit-2', allocationFte: 0.25, startDate: today,
    });
    expect(result.success).toBe(true);
  });

  it('rejects allocation above one FTE', () => {
    const result = secondaryAssignmentCreateSchema.safeParse({
      positionId: 'pos-2', orgUnitId: 'unit-2', allocationFte: 1.1, startDate: today,
    });
    expect(result.success).toBe(false);
  });

  it('validates explicit assignment ending', () => {
    expect(secondaryAssignmentEndSchema.safeParse({ endDate: '2026-08-10' }).success).toBe(true);
  });
  it('validates plan recovery actions', () => {
    expect(secondaryAssignmentPlanActionSchema.safeParse({ action: 'cancel' }).success).toBe(true);
    expect(secondaryAssignmentPlanActionSchema.safeParse({ action: 'retry' }).success).toBe(true);
    expect(secondaryAssignmentPlanActionSchema.safeParse({ action: 'force_apply' }).success).toBe(false);
  });
});
