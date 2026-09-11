import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  deterministicStructuredResume,
  sanitizeStructuredResume,
} from '../src/lib/recruiting/resume-structure';
import {
  looksLikeResumeNarrativeFragment,
  looksLikeResumeSectionHeading,
  normalizeEducationLocationMeta,
  resumeHeadingKind,
} from '../src/lib/recruiting/resume-style-intelligence';

const profile = (sourceText: string) => ({
  sourceText,
  skills: [] as string[],
  certifications: [] as string[],
});

describe('OPSIQO H51.30 style-adaptive resume intelligence', () => {
  it('understands nonstandard resume headings without turning thematic headings into employers', () => {
    expect(looksLikeResumeSectionHeading('GOVERNANCE, ADVISORY & INTERNATIONAL ENGAGEMENT')).toBe(true);
    expect(looksLikeResumeSectionHeading('Auranitis Life Line NGO')).toBe(false);
    expect(looksLikeResumeNarrativeFragment('storage, and expiry-control practices.')).toBe(true);
    expect(resumeHeadingKind('CORE LEADERSHIP CAPABILITIES')).toBe('skills');
    expect(resumeHeadingKind('CAREER EXPERIENCE')).toBe('experience');
  });

  it('parses functional / executive resume styles and recovers skills from capability headings', () => {
    const source = [
      'CORE LEADERSHIP CAPABILITIES',
      'Strategic Planning | HR Governance | Stakeholder Engagement',
      'PROFESSIONAL EXPERIENCE',
      'GOVERNANCE, ADVISORY & INTERNATIONAL ENGAGEMENT',
      'Director of Operations (Founding Leader) | Auranitis Life Line NGO',
      'January 2013 - December 2016 | Jordan',
      'Led governance, compliance, programs and operations.',
      'storage, and expiry-control practices.',
      'EDUCATION',
      'Graduate Certificate, Human Resources Management',
      'Loyalist College, Ontario (in progress; expected August 2026)',
    ].join('\n');

    const parsed = deterministicStructuredResume(profile(source));

    expect(parsed.employmentHistory.some(x => x.employer === 'GOVERNANCE, ADVISORY & INTERNATIONAL ENGAGEMENT')).toBe(false);
    expect(parsed.employmentHistory.some(x => /storage, and expiry-control practices/i.test(x.employer))).toBe(false);
    expect(parsed.employmentHistory).toEqual(expect.arrayContaining([
      expect.objectContaining({
        positionTitle: 'Director of Operations (Founding Leader)',
        employer: 'Auranitis Life Line NGO',
      }),
    ]));
    expect(parsed.skills).toEqual(expect.arrayContaining([
      'Strategic Planning',
      'HR Governance',
      'Stakeholder Engagement',
    ]));
    expect(parsed.educationHistory).toEqual(expect.arrayContaining([
      expect.objectContaining({
        degree: 'Graduate Certificate',
        fieldOfStudy: 'Human Resources Management',
        institution: 'Loyalist College',
        location: 'Ontario',
        graduationDate: 'August 2026',
      }),
    ]));
  });

  it('purges exact UAT heading/sentence contamination from AI employment records', () => {
    const source = [
      'PROFESSIONAL EXPERIENCE',
      'GOVERNANCE, ADVISORY & INTERNATIONAL ENGAGEMENT',
      'Director of Operations | Auranitis Life Line NGO',
      '2013 - 2016 | Jordan',
      'Led organization operations.',
      'storage, and expiry-control practices.',
      '2004 - 2011 | Syria',
    ].join('\n');

    const safe = sanitizeStructuredResume({
      employmentHistory: [
        { positionTitle: '', employer: 'GOVERNANCE, ADVISORY & INTERNATIONAL ENGAGEMENT', current: false, startDate: '2013', endDate: '2016', responsibilities: [] },
        { positionTitle: '', employer: 'storage, and expiry-control practices.', current: false, startDate: '2004', endDate: '2011', location: 'Syria', responsibilities: [] },
        { positionTitle: 'Director of Operations', employer: 'Auranitis Life Line NGO', current: false, startDate: '2013', endDate: '2016', location: 'Jordan', responsibilities: ['Led organization operations.'] },
      ],
      educationHistory: [],
      skills: [],
      certifications: [],
      languages: [],
      projects: [],
      volunteerExperience: [],
      awards: [],
      publications: [],
      additionalInformation: '',
    }, source);

    expect(safe.employmentHistory.some(x => x.employer === 'GOVERNANCE, ADVISORY & INTERNATIONAL ENGAGEMENT')).toBe(false);
    expect(safe.employmentHistory.some(x => /storage, and expiry-control practices/i.test(x.employer))).toBe(false);
    expect(safe.employmentHistory).toEqual(expect.arrayContaining([
      expect.objectContaining({ positionTitle: 'Director of Operations', employer: 'Auranitis Life Line NGO' }),
    ]));
  });

  it('separates education location from in-progress / expected-graduation metadata', () => {
    expect(normalizeEducationLocationMeta('Ontario (in progress; expected August 2026)')).toMatchObject({
      location: 'Ontario',
      expectedDate: 'August 2026',
      status: 'in progress',
    });
  });

  it('uses V11 style-adaptive AI reasoning and triggers repair for semantic contamination', () => {
    const provider = fs.readFileSync('src/lib/recruiting/ats-provider.ts', 'utf8');
    expect(provider).toContain('RECRUITING_RESUME_PARSE_V14_SOURCE_COMPLETENESS_CONVERGENCE');
    expect(provider).toContain('STYLE-ADAPTIVE RESUME REASONING');
    expect(provider).toContain('functional, combination/hybrid, skills-first');
    expect(provider).toContain('GOVERNANCE, ADVISORY & INTERNATIONAL ENGAGEMENT');
    expect(provider).toContain('storage, and expiry-control practices.');
    expect(provider).toContain('styleContamination');
    expect(provider).toContain('SKILLS COMPLETENESS');
  });

  it('keeps candidate verification truthful and visually blocks premature submission', () => {
    const portal = fs.readFileSync('src/components/candidate-application-portal.tsx', 'utf8');
    const service = fs.readFileSync('src/lib/recruiting/candidate-portal-service.ts', 'utf8');

    expect(portal).toContain('Improve these records with AI');
    expect(portal).toContain('Structured resume verification');
    expect(portal).toContain('Ready for final server verification');
    expect(portal).not.toContain('100% candidate-verified');
    expect(portal).toContain("!candidateReviewComplete||!accuracy||!consent");
    expect(service).toContain('structuredCriticalIssues');
    expect(service).toContain('candidateVerificationGate(verifiedStructuredResume,parsed.profile.sourceText)');
    expect(service).toContain('!verification.canFinalize');
    expect(service).toContain('resume_structural_review_required');
  });
});
