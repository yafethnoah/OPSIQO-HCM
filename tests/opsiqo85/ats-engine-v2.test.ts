import { describe, expect, it } from 'vitest';
import type { Candidate, Requisition } from '../../src/domain/recruiting';
import { analyzeJobDescription, buildAtsReview, parseResumeTextDeterministic, reviewCoverLetter } from '../../src/lib/recruiting/ats-engine';

const req: Requisition = {
  id: 'req-1', requisitionNumber: 'REQ-001', title: 'HR Manager', positionId: 'pos-1', orgUnitId: 'hr', hiringManagerWorkerId: 'mgr-1',
  employmentType: 'permanent', headcount: 1, openingsRemaining: 1,
  description: `Responsibilities\nLead HR operations and employee relations. Advise leaders on Ontario employment law.\nRequirements\nMinimum 5 years of HR experience.\nCHRL certification required.\nKnowledge of Ontario employment law required.\nExperience with recruitment and performance management required.`,
  requirements: ['Minimum 5 years of HR experience', 'CHRL certification', 'Knowledge of Ontario employment law', 'Recruitment and performance management experience'],
  status: 'open', requestedBy: 'u1', createdAt: '2026-08-14T00:00:00.000Z', updatedAt: '2026-08-14T00:00:00.000Z',
};
const candidate: Candidate = { id: 'c1', firstName: 'Alex', lastName: 'Morgan', displayName: 'Alex Morgan', email: 'alex@example.com', emailLower: 'alex@example.com', createdAt: '2026-08-14T00:00:00.000Z', updatedAt: '2026-08-14T00:00:00.000Z' };
const resume = `Alex Morgan\nalex@example.com\nHR Manager\n2016 - 2026\nLed HR operations, employee relations, recruitment, performance management and leadership advisory work in Ontario.\nCore Competencies\nOntario employment law, recruitment, performance management, employee relations, HR operations\nCertifications\nCHRL certification\nEducation\nBachelor degree in Business Administration`;

describe('OPSIQO ATS job-relevance engine v2', () => {
  it('produces an evidence-based alignment score from requisition requirements', () => {
    const profile = parseResumeTextDeterministic(resume);
    const review = buildAtsReview({ id: 'a1', applicationId: 'app1', candidateId: candidate.id, requisition: req, candidate, profile, createdBy: 'hr1', createdAt: '2026-08-14T00:00:00.000Z' });
    expect(review.score).toBeGreaterThanOrEqual(70);
    expect(review.matchedRequirements.length).toBeGreaterThanOrEqual(3);
    expect(review.humanReviewRequired).toBe(true);
    expect(review.decisionBoundary).toMatch(/does not automatically reject, hire/i);
    expect(review.evidence.some(e => e.evidence)).toBe(true);
  });

  it('excludes protected-trait terms from ATS keyword scoring', () => {
    const protectedReq = { ...req, description: `${req.description}\nPreferred: young female Canadian citizen`, requirements: [...(req.requirements || []), 'Young female Canadian citizen'] };
    const review = buildAtsReview({ id: 'a2', applicationId: 'app2', candidateId: candidate.id, requisition: protectedReq, candidate, profile: parseResumeTextDeterministic(resume), createdBy: 'hr1', createdAt: '2026-08-14T00:00:00.000Z' });
    const keywords = [...review.matchedKeywords, ...review.missingKeywords].join(' ').toLowerCase();
    expect(keywords).not.toMatch(/\b(age|gender|female|male|race|religion|disability|citizenship|nationality|pregnan|sexual|veteran)\b/);
    expect([...review.matchedRequirements, ...review.missingRequirements].join(' ')).not.toMatch(/young female Canadian citizen/i);
    expect(review.gaps.join(' ')).toMatch(/excluded from automated ATS scoring/i);
  });

  it('flags unsupported cover-letter claims instead of rewarding invented evidence', () => {
    const ats = buildAtsReview({ id: 'a3', applicationId: 'app3', candidateId: candidate.id, requisition: req, candidate, profile: parseResumeTextDeterministic(resume), createdBy: 'hr1', createdAt: '2026-08-14T00:00:00.000Z' });
    const letter = `Dear Hiring Team,\nI have increased global revenue by 900 percent through an AI robotics division and managed aerospace acquisitions. I am applying for the HR Manager role.\nSincerely, Alex`;
    const review = reviewCoverLetter(letter, ats, req);
    expect(review.humanReviewRequired).toBe(true);
    expect(review.unsupportedClaims.length).toBeGreaterThan(0);
    expect(review.recommendations.join(' ')).toMatch(/verify|remove/i);
  });

  it('extracts job-description requirements for recruiter review', () => {
    const jd = analyzeJobDescription(req.description || '');
    expect(jd.requirements.length).toBeGreaterThan(0);
    expect(jd.requiredYears).toBe(5);
    expect(jd.skills).not.toContain('female');
  });

  it('reports low evidence coverage instead of treating missing requisition criteria as perfect matches', () => {
    const sparse = { ...req, description: '', requirements: [] };
    const review = buildAtsReview({ id: 'a4', applicationId: 'app4', candidateId: candidate.id, requisition: sparse, candidate, profile: parseResumeTextDeterministic(resume), createdBy: 'hr1', createdAt: '2026-08-14T00:00:00.000Z' });
    expect(review.assessmentCoverage).toBeLessThan(50);
    expect(review.band).toBe('limited_evidence');
    expect(review.warnings.join(' ')).toMatch(/explicit.*requirements|coverage/i);
  });

});
