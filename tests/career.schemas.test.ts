import { describe, expect, it } from 'vitest';
import { readinessPolicySchema, successorNominationSchema, talentAssessmentSchema } from '../src/lib/career/schemas';

describe('Phase 3 career and succession schemas', () => {
  it('requires role-readiness weights to total exactly 100%', () => {
    expect(readinessPolicySchema.safeParse({ skillsWeightPct:70, performanceWeightPct:20, learningWeightPct:10, minimumPerformanceRating:3 }).success).toBe(true);
    expect(readinessPolicySchema.safeParse({ skillsWeightPct:80, performanceWeightPct:20, learningWeightPct:10, minimumPerformanceRating:3 }).success).toBe(false);
  });

  it('requires evidence for successor nominations', () => {
    expect(successorNominationSchema.safeParse({ positionId:'pos-1', workerId:'worker-2', readiness:'within_1_year', status:'nominated', nominationReason:'Demonstrated capability for broader responsibility.', evidence:[], developmentPriorities:[] }).success).toBe(false);
  });

  it('requires substantive evidence for human potential calibration', () => {
    const base={ workerId:'worker-2', cycleLabel:'2026 Talent Review', potentialRating:3, learningAgilityRating:3, aspirationRating:2, mobilityRating:2, leadershipBreadthRating:3 };
    expect(talentAssessmentSchema.safeParse({ ...base, potentialEvidence:'too short' }).success).toBe(false);
    expect(talentAssessmentSchema.safeParse({ ...base, potentialEvidence:'Demonstrated cross-functional leadership in two stretch assignments with sustained delivery evidence.' }).success).toBe(true);
  });
});
