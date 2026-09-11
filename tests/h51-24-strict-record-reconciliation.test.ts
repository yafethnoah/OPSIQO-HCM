import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import {
  assessStructuredResume,
  deriveStructuredExperienceYears,
  deterministicStructuredResume,
  mergeStructuredResume,
} from '../src/lib/recruiting/resume-structure';

const profile = (sourceText: string) => ({
  sourceText,
  skills: [] as string[],
  certifications: [] as string[],
});

describe('OPSIQO H51.24 strict record reconciliation', () => {
  const source = [
    'CORE EXECUTIVE CAPABILITIES',
    'Human Resources Leadership | Organizational Development | Workforce Planning | Stakeholder Engagement',
    'PROFESSIONAL EXPERIENCEChief Executive Officer (CEO)',
    'Auranitis Life Line NGO | Jordan / Syria',
    '2017 - 2025',
    'Led organizational strategy and growth.',
    'Director of Operations (Founding Leader) | Auranitis Life Line NGO | Jordan',
    '2013 - 2016',
    'Built core operational and governance systems.',
    'Co-Founder & Clinic Manager | Syrian Medical Care | Jordan',
    '2012 - 2013',
    'Managed multidisciplinary healthcare operations.',
    'Pharmacy Owner / Manager',
    'Shadi Pharmacy - Syria2003 - 2011',
    'Managed full business operations.',
    'EDUCATION',
    "Bachelor’s degree in pharmacy, Voronezh State University, Jan 1997 - Dec 2001",
    'CERTIFICATIONS',
    'PMD Pro 1 & 2',
    'LANGUAGES',
    'Arabic (Native) | English (Fluent)',
  ].join('\n');

  it('recovers fused headings and keeps employment anchors local', () => {
    const parsed = deterministicStructuredResume(profile(source));

    expect(parsed.employmentHistory).toEqual(expect.arrayContaining([
      expect.objectContaining({
        positionTitle: expect.stringContaining('Chief Executive Officer'),
        employer: 'Auranitis Life Line NGO',
      }),
      expect.objectContaining({
        positionTitle: expect.stringContaining('Director of Operations'),
        employer: 'Auranitis Life Line NGO',
        startDate: '2013',
        endDate: '2016',
      }),
      expect.objectContaining({
        positionTitle: 'Co-Founder & Clinic Manager',
        employer: 'Syrian Medical Care',
        startDate: '2012',
        endDate: '2013',
      }),
      expect.objectContaining({
        positionTitle: 'Pharmacy Owner / Manager',
        employer: 'Shadi Pharmacy',
        startDate: '2003',
        endDate: '2011',
      }),
    ]));
  });

  it('does not create employment cards from skill/responsibility prose', () => {
    const deterministic = deterministicStructuredResume(profile(source));
    const merged = mergeStructuredResume({
      employmentHistory: [
        {
          positionTitle: '',
          employer: 'Integrated LMS systems for progress tracking and engagement analytics.',
          responsibilities: [
            'Oversight, budget monitoring, relationship-building skills, time management, leadership skills.',
          ],
        },
        {
          positionTitle: '',
          employer: 'Syrian Medical Care',
          startDate: 'Jan 2003',
          endDate: 'Dec 2011',
          location: 'Irbid, Jordan',
          responsibilities: [],
        },
      ],
      educationHistory: [],
      skills: [],
      certifications: [],
      languages: [],
      projects: [],
      volunteerExperience: [],
      awards: [],
      publications: [],
    }, deterministic, source);

    expect(merged.employmentHistory.some((x) =>
      x.employer.includes('Integrated LMS systems')
    )).toBe(false);

    const clinic = merged.employmentHistory.find((x) => x.employer === 'Syrian Medical Care');
    expect(clinic?.startDate).toBe('2012');
    expect(clinic?.endDate).toBe('2013');

    const pharmacy = merged.employmentHistory.find((x) => x.employer === 'Shadi Pharmacy');
    expect(pharmacy?.startDate).toBe('2003');
    expect(pharmacy?.endDate).toBe('2011');
  });

  it('splits compound education into pure fields instead of duplicating the full source line', () => {
    const parsed = deterministicStructuredResume(profile(source));
    const education = parsed.educationHistory[0];

    expect(education).toMatchObject({
      degree: 'Bachelor’s degree',
      fieldOfStudy: 'pharmacy',
      institution: 'Voronezh State University',
      startDate: 'Jan 1997',
      endDate: 'Dec 2001',
    });

    expect(education?.institution).not.toContain('Bachelor');
    expect(education?.institution).not.toContain('1997');
    expect(education?.endDate).not.toContain('University');
  });

  it('recovers expanded skill headings plus certifications and languages', () => {
    const parsed = deterministicStructuredResume(profile(source));

    expect(parsed.skills).toEqual(expect.arrayContaining([
      'Human Resources Leadership',
      'Organizational Development',
      'Workforce Planning',
      'Stakeholder Engagement',
    ]));
    expect(parsed.certifications.map((x) => x.name)).toContain('PMD Pro 1 & 2');
    expect(parsed.languages).toEqual(expect.arrayContaining([
      { language: 'Arabic', proficiency: 'Native' },
      { language: 'English', proficiency: 'Fluent' },
    ]));
  });

  it('treats visible skills certifications and languages with empty output as critical', () => {
    const empty = {
      employmentHistory: [],
      educationHistory: [],
      skills: [],
      certifications: [],
      languages: [],
      projects: [],
      volunteerExperience: [],
      awards: [],
      publications: [],
    };

    const assessment = assessStructuredResume(
      empty,
      'SKILLS\nRecruitment\nCERTIFICATIONS\nCHRE\nLANGUAGES\nEnglish (Fluent)',
    );

    expect(assessment.criticalIssues).toEqual(expect.arrayContaining([
      'Skills section detected but no reliable skills were built.',
      'Certification section detected but no reliable certification records were built.',
      'Language section detected but no reliable language records were built.',
    ]));
  });

  it('derives experience from the union of valid date intervals rather than double-counting overlaps', () => {
    const years = deriveStructuredExperienceYears([
      {
        positionTitle: 'Chief Executive Officer',
        employer: 'Auranitis Life Line NGO',
        startDate: '2017',
        endDate: '2025',
        responsibilities: [],
      },
      {
        positionTitle: 'Director of Operations',
        employer: 'Auranitis Life Line NGO',
        startDate: '2013',
        endDate: '2018',
        responsibilities: [],
      },
      {
        positionTitle: 'Pharmacy Owner / Manager',
        employer: 'Shadi Pharmacy',
        startDate: '2003',
        endDate: '2011',
        responsibilities: [],
      },
    ], new Date('2026-01-01T00:00:00Z'));

    expect(years).toBe(22);
  });

  it('keeps H51.29 candidate review recovery fail-closed at final submission', () => {
    const candidateService = fs.readFileSync(
      'src/lib/recruiting/candidate-portal-service.ts',
      'utf8',
    );
    const atsService = fs.readFileSync(
      'src/lib/recruiting/ats-service.ts',
      'utf8',
    );

    const parseStart = candidateService.indexOf('export async function parsePublicCandidateResume');
    const parseEnd = candidateService.indexOf('export async function', parseStart + 20);
    const parseBlock = candidateService.slice(
      parseStart,
      parseEnd > parseStart ? parseEnd : undefined,
    );

    expect(parseBlock).not.toContain('humanReviewFallback');
    expect(parseBlock).toContain(
      'parseResumeFile(a,file,{requireStructuredPrefill:false})',
    );
    expect(parseBlock).toContain('requiresCandidateReview:true');
    expect(parseBlock).toContain('structuredIssues');
    expect(parseBlock).toContain('editable source-grounded review draft');

    const submitStart = candidateService.indexOf(
      'export async function submitPublicCandidateApplication',
    );
    const submitEnd = candidateService.indexOf(
      'export async function',
      submitStart + 20,
    );
    const submitBlock = candidateService.slice(
      submitStart,
      submitEnd > submitStart ? submitEnd : undefined,
    );

    expect(submitBlock).toContain(
      'parseResumeFile(a,rf,{requireStructuredPrefill:false})',
    );
    expect(submitBlock).toContain(
      'candidateVerificationGate(verifiedStructuredResume,parsed.profile.sourceText)',
    );
    expect(submitBlock).toContain('!verification.canFinalize');
    expect(submitBlock).toContain('resume_structural_review_required');

    expect(atsService).toContain('!coverage.prefillReady');
    expect(atsService).toContain(
      'parseResumeFile(actor, file, { requireStructuredPrefill: false })',
    );
  });
});
