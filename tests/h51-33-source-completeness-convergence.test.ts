import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  assessStructuredResume,
  deterministicStructuredResume,
  sanitizeStructuredResume,
} from '../src/lib/recruiting/resume-structure';

const base = () => ({
  employmentHistory: [],
  educationHistory: [],
  skills: [],
  certifications: [],
  languages: [],
  projects: [],
  volunteerExperience: [],
  awards: [],
  publications: [],
  additionalInformation: '',
});

describe('OPSIQO H51.33 source completeness + readiness convergence', () => {
  it('recovers a distant wrapped expected graduation inside the same education record', () => {
    const source = [
      'EDUCATION & CREDENTIALS',
      'Postgraduate Certificate',
      'Human Resources Management',
      'Loyalist College',
      'Ontario',
      'Program status',
      'in progress',
      'Academic note',
      'expected',
      'August 2026',
    ].join('\n');

    const safe = sanitizeStructuredResume({
      ...base(),
      educationHistory: [{
        degree: 'Postgraduate Certificate',
        fieldOfStudy: 'Human Resources Management',
        institution: 'Loyalist College',
        location: 'Ontario',
      }],
    }, source);

    expect(safe.educationHistory[0]).toMatchObject({
      institution: 'Loyalist College',
      location: 'Ontario',
      graduationDate: 'August 2026',
      completed: false,
    });
  });

  it('blocks readiness when source-supported expected completion silently disappears', () => {
    const source = [
      'EDUCATION & CREDENTIALS',
      'Postgraduate Certificate',
      'Human Resources Management',
      'Loyalist College',
      'Ontario',
      'in progress; expected August 2026',
    ].join('\n');

    const assessment = assessStructuredResume({
      ...base(),
      educationHistory: [{
        degree: 'Postgraduate Certificate',
        fieldOfStudy: 'Human Resources Management',
        institution: 'Loyalist College',
        location: 'Ontario',
      }],
    }, source);

    expect(assessment.criticalIssues.join(' ')).toMatch(/expected graduation August 2026.*missing/i);
  });

  it('blocks a completed flag when source says the education is still in progress', () => {
    const source = [
      'EDUCATION',
      'Postgraduate Certificate',
      'Loyalist College',
      'Ontario',
      'in progress; expected August 2026',
    ].join('\n');

    const assessment = assessStructuredResume({
      ...base(),
      educationHistory: [{
        degree: 'Postgraduate Certificate',
        institution: 'Loyalist College',
        location: 'Ontario',
        graduationDate: 'August 2026',
        completed: true,
      }],
    }, source);

    expect(assessment.criticalIssues.join(' ')).toMatch(/in progress.*marked completed/i);
  });

  it('recovers strong inline certification evidence without requiring a perfect heading', () => {
    const source = [
      'PROFESSIONAL DEVELOPMENT',
      'Microsoft Certified: Azure AI Fundamentals',
      'IBM AI Engineering Professional Certificate',
    ].join('\n');

    const deterministic = deterministicStructuredResume({
      sourceText: source,
      skills: [],
      certifications: [],
    });

    expect(deterministic.certifications.map((x) => x.name)).toEqual(expect.arrayContaining([
      'Microsoft Certified: Azure AI Fundamentals',
      'IBM AI Engineering Professional Certificate',
    ]));
  });

  it('treats source certification evidence with zero structured records as a critical completeness issue', () => {
    const source = [
      'ADDITIONAL TRAINING',
      'Microsoft Certified: Azure AI Fundamentals',
    ].join('\n');

    const assessment = assessStructuredResume(base(), source);
    expect(assessment.criticalIssues.join(' ')).toMatch(/source-supported certification evidence.*no structured certification records/i);
  });

  it('does not treat an action sentence about credential administration as a certification record', () => {
    const source = [
      'PROFESSIONAL EXPERIENCE',
      'HR Manager | Example Foundation',
      'Managed credential verification processes for staff onboarding.',
    ].join('\n');

    const deterministic = deterministicStructuredResume({
      sourceText: source,
      skills: [],
      certifications: [],
    });

    expect(deterministic.certifications).toHaveLength(0);
  });

  it('preserves precise Current-status validation from H51.32', () => {
    const source = [
      'PROFESSIONAL EXPERIENCE',
      'HR Practicum',
      'Example Foundation',
      '2026',
      'Supported current policy modernization priorities.',
    ].join('\n');

    const safe = sanitizeStructuredResume({
      ...base(),
      employmentHistory: [{
        positionTitle: 'HR Practicum',
        employer: 'Example Foundation',
        startDate: '2026',
        current: true,
        responsibilities: ['Supported current policy modernization priorities.'],
      }],
    }, source);

    expect(safe.employmentHistory[0]?.current).toBe(false);
  });

  it('exposes source-completeness readiness in the candidate UI and V14 AI contract', () => {
    const ui = fs.readFileSync('src/components/candidate-application-portal.tsx', 'utf8');
    const provider = fs.readFileSync('src/lib/recruiting/ats-provider.ts', 'utf8');

    expect(ui).toContain('Record-bound semantic and source-completeness readiness checks passed for the records currently shown.');
    expect(ui).toContain('critical resume structure/completeness issue(s) need correction.');
    expect(provider).toContain('RECRUITING_RESUME_PARSE_V15_RECORD_BOUND_EDUCATION_PROVENANCE');
    expect(provider).toContain('SOURCE COMPLETENESS CONVERGENCE');
    expect(provider).toContain('recover source-supported certifications/licences');
  });

  it('preserves final fail-closed verification and original Fit evidence authority', () => {
    const service = fs.readFileSync('src/lib/recruiting/candidate-portal-service.ts', 'utf8');
    const ui = fs.readFileSync('src/components/candidate-application-portal.tsx', 'utf8');

    expect(service).toContain('candidateEnteredVerification');
    expect(service).toContain('candidateVerificationGate(verifiedStructuredResume,parsed.profile.sourceText)');
    expect(service).toContain('!verification.canFinalize');
    expect(ui).toContain('internal Fit % remains grounded in the original uploaded resume evidence');
  });
});
