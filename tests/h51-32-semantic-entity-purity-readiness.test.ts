import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  assessStructuredResume,
  sanitizeStructuredResume,
} from '../src/lib/recruiting/resume-structure';
import { normalizeResumeSkills } from '../src/lib/recruiting/resume-semantic-reconstruction';

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

describe('OPSIQO H51.32 semantic entity purity + truthful readiness', () => {
  it('rejects action/responsibility clauses from title and employer fields', () => {
    const source = [
      'PROFESSIONAL EXPERIENCE',
      'Chief Executive Officer | Auranitis Life Line NGO',
      '2020 - 2024',
      'Led executive engagement with boards, donors, governments, INGOs and UN partners.',
      'Pharmacy Owner / Manager | Shady Pharmacy',
      '2010 - 2012',
      'Co-founded and managed a high-volume community clinic supporting vulnerable families.',
    ].join('\n');

    const input = {
      ...base(),
      employmentHistory: [
        {
          positionTitle: 'Led executive engagement with boards, donors, governments, INGOs and UN partners.',
          employer: 'Auranitis Life Line NGO',
          current: false,
          startDate: '2020',
          endDate: '2024',
          responsibilities: [],
        },
        {
          positionTitle: 'Pharmacy Owner / Manager',
          employer: 'Co-founded and managed a high-volume community clinic supporting vulnerable families.',
          current: false,
          startDate: '2010',
          endDate: '2012',
          responsibilities: [],
        },
      ],
    };

    const assessment = assessStructuredResume(input, source);
    expect(assessment.criticalIssues.join(' ')).toMatch(/position title is responsibility\/narrative text/i);
    expect(assessment.criticalIssues.join(' ')).toMatch(/employer is responsibility\/narrative text/i);

    const safe = sanitizeStructuredResume(input, source);
    expect(safe.employmentHistory).toHaveLength(0);
  });

  it('deduplicates contaminated volunteer organizations to the clean canonical organization', () => {
    const source = [
      'VOLUNTEER EXPERIENCE',
      'Volunteer Leadership & Policy Contributor, Syrian Civil Society Room',
      '2016 - 2018',
      'Office of the United Nations Special Envoy engagement was part of the role.',
    ].join('\n');

    const safe = sanitizeStructuredResume({
      ...base(),
      volunteerExperience: [
        {
          role: 'Volunteer Leadership & Policy Contributor',
          organization: 'Syrian Civil Society Room - Office of the United Nations Special Envoy',
          startDate: '2016',
          endDate: '2018',
        },
        {
          role: 'Volunteer Leadership & Policy Contributor',
          organization: 'Syrian Civil Society Room',
          startDate: '2016',
          endDate: '2018',
        },
      ],
    }, source);

    expect(safe.volunteerExperience).toHaveLength(1);
    expect(safe.volunteerExperience[0]?.organization).toBe('Syrian Civil Society Room');
  });

  it('does not infer Current from unrelated nearby prose', () => {
    const source = [
      'PROFESSIONAL EXPERIENCE',
      'Human Resources & Governance Practicum',
      'Syrian Canadian Foundation',
      '2026 | Canada',
      'Supported current policy modernization priorities.',
    ].join('\n');

    const safe = sanitizeStructuredResume({
      ...base(),
      employmentHistory: [{
        positionTitle: 'Human Resources & Governance Practicum',
        employer: 'Syrian Canadian Foundation',
        current: true,
        startDate: '2026',
        responsibilities: ['Supported current policy modernization priorities.'],
      }],
    }, source);

    expect(safe.employmentHistory[0]?.current).toBe(false);
  });

  it('requires explicit local Current/Present status tied to the employment date block', () => {
    const source = [
      'PROFESSIONAL EXPERIENCE',
      'Human Resources & Governance Practicum',
      'Syrian Canadian Foundation',
      '2026 - Present | Canada',
    ].join('\n');

    const safe = sanitizeStructuredResume({
      ...base(),
      employmentHistory: [{
        positionTitle: 'Human Resources & Governance Practicum',
        employer: 'Syrian Canadian Foundation',
        current: true,
        startDate: '2026',
        responsibilities: [],
      }],
    }, source);

    expect(safe.employmentHistory[0]?.current).toBe(true);
  });

  it('recovers expected graduation when expected and date are wrapped across lines', () => {
    const source = [
      'EDUCATION & CREDENTIALS',
      'Graduate Certificate, Human Resources Management',
      'Loyalist College, Ontario (',
      'in progress; expected',
      'August 2026)',
    ].join('\n');

    const safe = sanitizeStructuredResume({
      ...base(),
      educationHistory: [{
        degree: 'Graduate Certificate',
        fieldOfStudy: 'Human Resources Management',
        institution: 'Loyalist College',
        location: 'Ontario',
      }],
    }, source);

    expect(safe.educationHistory[0]?.location).toBe('Ontario');
    expect(safe.educationHistory[0]?.graduationDate).toBe('August 2026');
  });

  it('marks missing source-supported expected graduation as a critical readiness issue', () => {
    const source = [
      'EDUCATION & CREDENTIALS',
      'Graduate Certificate, Human Resources Management',
      'Loyalist College, Ontario',
      'in progress; expected August 2026',
    ].join('\n');

    const assessment = assessStructuredResume({
      ...base(),
      educationHistory: [{
        degree: 'Graduate Certificate',
        fieldOfStudy: 'Human Resources Management',
        institution: 'Loyalist College',
        location: 'Ontario',
      }],
    }, source);

    expect(assessment.criticalIssues.join(' ')).toMatch(/expected graduation August 2026.*missing/i);
  });

  it('removes semantically redundant shorter skill phrases when a fuller supported phrase exists', () => {
    const source = 'Board, Government & Donor Relations | Government & Donor Relations';
    expect(normalizeResumeSkills(
      ['Board, Government & Donor Relations', 'Government & Donor Relations'],
      source,
    )).toEqual(['Board, Government & Donor Relations']);
  });

  it('unions server critical issues into client readiness and sends them to targeted AI repair', () => {
    const ui = fs.readFileSync('src/components/candidate-application-portal.tsx', 'utf8');
    const service = fs.readFileSync('src/lib/recruiting/candidate-portal-service.ts', 'utf8');
    const provider = fs.readFileSync('src/lib/recruiting/ats-provider.ts', 'utf8');

    expect(ui).toContain('...serverCriticalIssues');
    expect(ui).toContain("d.set('repairIssues',JSON.stringify(repairableIssues))");
    expect(ui).toContain('Semantic and source-completeness readiness checks passed for the records currently shown.');
    expect(ui).not.toContain('No client-side critical structure issues detected.');
    expect(service).toContain("form.get('repairIssues')");
    expect(service).toContain('candidateEnteredVerification');
    expect(service).toContain('!candidateEnteredVerification.canFinalize');
    expect(provider).toContain('RECRUITING_RESUME_PARSE_V14_SOURCE_COMPLETENESS_CONVERGENCE');
    expect(provider).toContain('SEMANTIC ENTITY PURITY + TRUTHFUL READINESS');
  });

  it('preserves the final fail-closed verification and original Fit evidence boundary', () => {
    const service = fs.readFileSync('src/lib/recruiting/candidate-portal-service.ts', 'utf8');
    const ui = fs.readFileSync('src/components/candidate-application-portal.tsx', 'utf8');

    expect(service).toContain('candidateVerificationGate(verifiedStructuredResume,parsed.profile.sourceText)');
    expect(service).toContain('!verification.canFinalize');
    expect(ui).toContain('internal Fit % remains grounded in the original uploaded resume evidence');
  });
});
