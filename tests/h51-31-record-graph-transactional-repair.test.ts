import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  deriveValidatedStructuredExperienceYears,
  sanitizeStructuredResume,
  transactionalStructuredRepair,
} from '../src/lib/recruiting/resume-structure';
import { normalizeResumeSkills } from '../src/lib/recruiting/resume-semantic-reconstruction';
import {
  looksLikeResumeNarrativeFragment,
  normalizeEducationLocationMeta,
  resumeHeadingKind,
} from '../src/lib/recruiting/resume-style-intelligence';

const baseProfile = () => ({
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

describe('OPSIQO H51.31 record graph + transactional repair', () => {
  it('merges the practicum partial duplicate into the complete employment relationship', () => {
    const source = [
      'PROFESSIONAL EXPERIENCE',
      'Human Resources & Governance Practicum',
      'Syrian Canadian Foundation',
      '2026 | Canada',
      'Supported HR governance and policy implementation.',
    ].join('\n');

    const safe = sanitizeStructuredResume({
      ...baseProfile(),
      employmentHistory: [
        { positionTitle: '', employer: 'Human Resources & Governance Practicum', current: true, startDate: '2026', location: 'Canada', responsibilities: [] },
        { positionTitle: 'Human Resources & Governance Practicum', employer: 'Syrian Canadian Foundation', current: false, startDate: '2026', location: 'Canada', responsibilities: ['Supported HR governance and policy implementation.'] },
      ],
    }, source);

    expect(safe.employmentHistory).toHaveLength(1);
    expect(safe.employmentHistory[0]).toMatchObject({
      positionTitle: 'Human Resources & Governance Practicum',
      employer: 'Syrian Canadian Foundation',
      current: false,
    });
  });

  it('moves a volunteer composite out of employment and into volunteer experience', () => {
    const source = [
      'VOLUNTEER EXPERIENCE',
      'Volunteer Leadership & Policy Contributor, Syrian Civil Society Room',
      '2016 - 2018',
    ].join('\n');

    const safe = sanitizeStructuredResume({
      ...baseProfile(),
      employmentHistory: [
        { positionTitle: '', employer: 'Volunteer Leadership & Policy Contributor, Syrian Civil Society Room', current: true, startDate: '2016', responsibilities: [] },
      ],
    }, source);

    expect(safe.employmentHistory).toHaveLength(0);
    expect(safe.volunteerExperience).toEqual(expect.arrayContaining([
      expect.objectContaining({
        role: 'Volunteer Leadership & Policy Contributor',
        organization: 'Syrian Civil Society Room',
      }),
    ]));
  });

  it('requires explicit source evidence before marking a job current', () => {
    const noPresent = [
      'PROFESSIONAL EXPERIENCE',
      'HR Manager | Example Foundation',
      '2024 | Canada',
    ].join('\n');

    const withPresent = [
      'PROFESSIONAL EXPERIENCE',
      'HR Manager | Example Foundation',
      '2024 - Present | Canada',
    ].join('\n');

    const record = { positionTitle: 'HR Manager', employer: 'Example Foundation', current: true, startDate: '2024', responsibilities: [] };

    expect(sanitizeStructuredResume({ ...baseProfile(), employmentHistory: [record] }, noPresent).employmentHistory[0]?.current).toBe(false);
    expect(sanitizeStructuredResume({ ...baseProfile(), employmentHistory: [record] }, withPresent).employmentHistory[0]?.current).toBe(true);
  });

  it('cleans broken education location fragments and recovers expected graduation locally', () => {
    const source = [
      'EDUCATION & CREDENTIALS',
      'Graduate Certificate, Human Resources Management',
      'Loyalist College, Ontario (',
      'in progress; expected August 2026)',
    ].join('\n');

    const safe = sanitizeStructuredResume({
      ...baseProfile(),
      employmentHistory: [],
      educationHistory: [{
        degree: 'Graduate Certificate',
        fieldOfStudy: 'Human Resources Management',
        institution: 'Loyalist College',
        location: 'Ontario (',
      }],
    }, source);

    expect(normalizeEducationLocationMeta('Ontario (')).toMatchObject({ location: 'Ontario' });
    expect(safe.educationHistory[0]).toMatchObject({
      institution: 'Loyalist College',
      location: 'Ontario',
      graduationDate: 'August 2026',
    });
  });

  it('rejects standalone semantic fragments from skills while preserving real competencies', () => {
    expect(normalizeResumeSkills(['Board', 'Strategic Planning', 'Excel'], 'Board Strategic Planning Excel'))
      .toEqual(['Strategic Planning', 'Excel']);
  });

  it('recognizes volunteer headings and narrative fragments that previously leaked into entity fields', () => {
    expect(resumeHeadingKind('VOLUNTEER LEADERSHIP')).toBe('volunteer');
    expect(looksLikeResumeNarrativeFragment('Governance discussions, and engagement with international partners')).toBe(true);
  });

  it('derives experience only from validated, source-grounded employment intervals', () => {
    const source = [
      'PROFESSIONAL EXPERIENCE',
      'HR Manager | Example Foundation',
      '2020 - 2022',
      'VOLUNTEER EXPERIENCE',
      'Volunteer Advisor, Community Forum',
      '2010 - Present',
    ].join('\n');

    const years = deriveValidatedStructuredExperienceYears([
      { positionTitle: 'HR Manager', employer: 'Example Foundation', startDate: '2020', endDate: '2022', current: false, responsibilities: [] },
      { positionTitle: '', employer: 'Volunteer Advisor, Community Forum', startDate: '2010', current: true, responsibilities: [] },
    ], source, new Date('2026-01-01T00:00:00Z'));

    // Existing OPSIQO semantics treat a year-only end value as the end of that calendar year.
    // 2020-2022 therefore represents three covered calendar years; the volunteer interval must not contribute.
    expect(years).toBeCloseTo(3, 1);
  });

  it('accepts only non-regressive structured AI repair', () => {
    const source = [
      'PROFESSIONAL EXPERIENCE',
      'HR Manager | Example Foundation',
      '2020 - 2022',
    ].join('\n');

    const current = {
      ...baseProfile(),
      employmentHistory: [{ positionTitle: 'HR Manager', employer: '', current: false, startDate: '2020', endDate: '2022', responsibilities: [] }],
    };
    const improved = {
      ...baseProfile(),
      employmentHistory: [{ positionTitle: 'HR Manager', employer: 'Example Foundation', current: false, startDate: '2020', endDate: '2022', responsibilities: [] }],
    };
    const worse = {
      ...baseProfile(),
      employmentHistory: [{ positionTitle: '', employer: 'Example Foundation', current: false, startDate: '2020', endDate: '2022', responsibilities: [] }],
    };

    expect(transactionalStructuredRepair(current, improved, source).accepted).toBe(true);
    expect(transactionalStructuredRepair(improved, worse, source).accepted).toBe(false);
  });

  it('implements V12 record-graph reasoning and targeted transactional repair UI', () => {
    const provider = fs.readFileSync('src/lib/recruiting/ats-provider.ts', 'utf8');
    const service = fs.readFileSync('src/lib/recruiting/candidate-portal-service.ts', 'utf8');
    const portal = fs.readFileSync('src/components/candidate-application-portal.tsx', 'utf8');

    expect(provider).toContain('RECRUITING_RESUME_PARSE_V13_SEMANTIC_ENTITY_PURITY_READINESS');
    expect(provider).toContain('DOCUMENT-GRAPH REASONING');
    expect(provider).toContain('transactional_repair_accepted');
    expect(provider).toContain('transactional_repair_rolled_back');
    expect(provider).toContain('governedStructuredResumeRepair');
    expect(service).toContain("String(form.get('mode')||'')==='repair'");
    expect(service).toContain('transactionalStructuredRepair');
    expect(service).toContain('verifiedYearsOfExperience');
    expect(portal).toContain("d.set('mode','repair')");
    expect(portal).toContain('AI repair made no safe structural improvement');
    expect(portal).toContain('AI repair accepted:');
  });
});
